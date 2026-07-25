import { LightningElement } from 'lwc';
import { subscribe, unsubscribe, onError } from 'lightning/empApi';
import getSummary from '@salesforce/apex/OpsPulseController.getSummary';
import getOpenCases from '@salesforce/apex/OpsPulseController.getOpenCases';
import getCaseSnapshot from '@salesforce/apex/OpsPulseController.getCaseSnapshot';

const CHANNEL = '/data/CaseChangeEvent';
const PRIO_CLASS = { High: 'prio prio_high', Medium: 'prio prio_med', Low: 'prio prio_low' };
const STATUS_CLASS = {
    New: 'status status_new',
    Working: 'status status_working',
    Escalated: 'status status_escalated',
    Closed: 'status status_closed'
};

export default class OpsPulse extends LightningElement {
    summary = { openCount: 0, newToday: 0, highPriorityOpen: 0, closedToday: 0 };
    rowMap = new Map();
    feed = [];
    subscription;
    live = false;

    connectedCallback() {
        this.loadSummary();
        this.loadOpenCases();
        this.subscribeToChanges();
    }

    disconnectedCallback() {
        if (this.subscription) unsubscribe(this.subscription);
    }

    async loadSummary() {
        try {
            this.summary = await getSummary();
        } catch (e) {
            // Non-fatal; tiles just stay at their last known value.
        }
    }

    async loadOpenCases() {
        try {
            const rows = await getOpenCases();
            this.rowMap = new Map(rows.map((r) => [r.id, r]));
        } catch (e) {
            // Non-fatal; the live feed will still populate the board over time.
        }
    }

    subscribeToChanges() {
        onError(() => {
            this.live = false;
        });
        subscribe(CHANNEL, -1, (event) => this.handleChangeEvent(event)).then((sub) => {
            this.subscription = sub;
            this.live = true;
        });
    }

    async handleChangeEvent(event) {
        const header = event && event.data && event.data.payload && event.data.payload.ChangeEventHeader;
        if (!header) return;

        const changeType = header.changeType;
        const recordIds = header.recordIds || [];

        for (const id of recordIds) {
            this.logActivity(changeType, id);
            if (changeType === 'DELETE') {
                this.rowMap.delete(id);
                continue;
            }
            try {
                const row = await getCaseSnapshot({ caseId: id });
                if (!row || row.isClosed) {
                    this.rowMap.delete(id);
                } else {
                    this.rowMap.set(id, row);
                }
            } catch (e) {
                this.rowMap.delete(id);
            }
        }
        this.rowMap = new Map(this.rowMap);
        this.loadSummary();
    }

    logActivity(changeType, id) {
        const entry = {
            key: `${id}-${Date.now()}`,
            label: `${changeType} · Case ${id.substring(0, 15)}`,
            time: new Date().toLocaleTimeString()
        };
        this.feed = [entry, ...this.feed].slice(0, 12);
    }

    get rows() {
        return Array.from(this.rowMap.values())
            .sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate))
            .map((r) => ({
                ...r,
                prioClass: PRIO_CLASS[r.priority] || 'prio prio_med',
                statusClass: STATUS_CLASS[r.status] || 'status status_new'
            }));
    }

    get hasRows() {
        return this.rows.length > 0;
    }

    get hasFeed() {
        return this.feed.length > 0;
    }

    get tiles() {
        return [
            { key: 'open', label: 'Open Cases', value: this.summary.openCount },
            { key: 'new', label: 'New Today', value: this.summary.newToday },
            { key: 'high', label: 'High Priority Open', value: this.summary.highPriorityOpen },
            { key: 'closed', label: 'Closed Today', value: this.summary.closedToday }
        ];
    }

    get liveLabel() {
        return this.live ? 'Live' : 'Connecting…';
    }

    get liveClass() {
        return this.live ? 'live-dot live-on' : 'live-dot';
    }
}
