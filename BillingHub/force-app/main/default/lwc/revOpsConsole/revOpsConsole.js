import { LightningElement } from 'lwc';
import { subscribe, unsubscribe, onError } from 'lightning/empApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import getSummary from '@salesforce/apex/RevOpsController.getSummary';
import getRecentInvoices from '@salesforce/apex/RevOpsController.getRecentInvoices';
import getInvoiceSnapshot from '@salesforce/apex/RevOpsController.getInvoiceSnapshot';
import getPendingRefunds from '@salesforce/apex/RevOpsController.getPendingRefunds';
import decideRefund from '@salesforce/apex/RevOpsController.decideRefund';
import getCanceledSubscriptions from '@salesforce/apex/RevOpsController.getCanceledSubscriptions';
import getChurnInsights from '@salesforce/apex/RevOpsController.getChurnInsights';
import analyzeChurn from '@salesforce/apex/RevOpsController.analyzeChurn';

const CHANNEL = '/data/Invoice__ChangeEvent';
const STATUS_CLASS = {
    Pending: 'status status_pending',
    Paid: 'status status_paid',
    Failed: 'status status_failed',
    Refunded: 'status status_refunded'
};

export default class RevOpsConsole extends LightningElement {
    summary = { mrr: 0, failedPaymentsToday: 0, activeDunning: 0, pendingRefunds: 0 };
    invoiceMap = new Map();
    refunds = [];
    canceled = [];
    insightBySubscription = new Map();
    busySubscriptionId;
    subscription;
    liveState = 'connecting'; // 'connecting' | 'live' | 'error'
    refreshing = false;

    connectedCallback() {
        this.loadAll();
        this.subscribeToChanges();
    }

    disconnectedCallback() {
        if (this.subscription) unsubscribe(this.subscription);
    }

    async loadAll() {
        await Promise.all([
            this.loadSummary(),
            this.loadInvoices(),
            this.loadRefunds(),
            this.loadCanceled(),
            this.loadInsights()
        ]);
    }

    async loadSummary() {
        try {
            this.summary = await getSummary();
        } catch (e) {
            // non-fatal
        }
    }

    async loadInvoices() {
        try {
            const rows = await getRecentInvoices();
            this.invoiceMap = new Map(rows.map((r) => [r.Id, r]));
        } catch (e) {
            // non-fatal
        }
    }

    async loadRefunds() {
        try {
            this.refunds = await getPendingRefunds();
        } catch (e) {
            // non-fatal
        }
    }

    async loadCanceled() {
        try {
            this.canceled = await getCanceledSubscriptions();
        } catch (e) {
            // non-fatal
        }
    }

    async loadInsights() {
        try {
            const insights = await getChurnInsights();
            this.insightBySubscription = new Map(insights.map((i) => [i.Subscription__c, i]));
        } catch (e) {
            // non-fatal
        }
    }

    subscribeToChanges() {
        // eslint-disable-next-line no-console
        onError((error) => console.error('EMP API error', JSON.stringify(error)));
        subscribe(CHANNEL, -1, (event) => this.handleChangeEvent(event))
            .then((sub) => {
                this.subscription = sub;
                this.liveState = 'live';
            })
            .catch(() => {
                this.liveState = 'error';
            });
    }

    async handleChangeEvent(event) {
        const header = event && event.data && event.data.payload && event.data.payload.ChangeEventHeader;
        if (!header) return;

        for (const id of header.recordIds || []) {
            if (header.changeType === 'DELETE') {
                this.invoiceMap.delete(id);
                continue;
            }
            try {
                const row = await getInvoiceSnapshot({ invoiceId: id });
                if (row) this.invoiceMap.set(id, row);
            } catch (e) {
                // record may no longer be visible
            }
        }
        this.invoiceMap = new Map(this.invoiceMap);
        this.loadSummary();
    }

    async handleRefresh() {
        this.refreshing = true;
        try {
            await this.loadAll();
        } finally {
            this.refreshing = false;
        }
    }

    async handleApproveRefund(event) {
        await this.decide(event.target.dataset.id, true);
    }

    async handleRejectRefund(event) {
        await this.decide(event.target.dataset.id, false);
    }

    async decide(refundId, approve) {
        try {
            await decideRefund({ refundRequestId: refundId, approve, notes: approve ? 'Approved from RevOps console.' : 'Rejected from RevOps console.' });
            this.toast(approve ? 'Refund approved.' : 'Refund rejected.', 'success');
            await Promise.all([this.loadRefunds(), this.loadSummary(), this.loadInvoices()]);
        } catch (e) {
            this.toast(this.errorOf(e), 'error');
        }
    }

    async handleAnalyzeChurn(event) {
        const subscriptionId = event.target.dataset.id;
        this.busySubscriptionId = subscriptionId;
        try {
            await analyzeChurn({ subscriptionId });
            await this.loadInsights();
        } catch (e) {
            this.toast(this.errorOf(e), 'error');
        } finally {
            this.busySubscriptionId = undefined;
        }
    }

    toast(message, variant) {
        this.dispatchEvent(new ShowToastEvent({ message, variant }));
    }

    errorOf(e) {
        return (e && e.body && e.body.message) || 'Something went wrong.';
    }

    get tiles() {
        return [
            { key: 'mrr', label: 'MRR', value: `$${this.summary.mrr}` },
            { key: 'failed', label: 'Failed Payments Today', value: this.summary.failedPaymentsToday },
            { key: 'dunning', label: 'Active Dunning', value: this.summary.activeDunning },
            { key: 'refunds', label: 'Pending Refunds', value: this.summary.pendingRefunds }
        ];
    }

    get invoiceRows() {
        return Array.from(this.invoiceMap.values())
            .sort((a, b) => (b.Id > a.Id ? 1 : -1))
            .map((inv) => ({
                id: inv.Id,
                name: inv.Name,
                customer: inv.Subscription__r ? inv.Subscription__r.Customer_Name__c : '—',
                amount: inv.Amount__c,
                status: inv.Status__c,
                statusClass: STATUS_CLASS[inv.Status__c] || 'status status_pending',
                attempts: inv.Attempt_Count__c
            }));
    }

    get refundRows() {
        return this.refunds.map((r) => ({
            id: r.Id,
            name: r.Name,
            invoice: r.Invoice__r ? r.Invoice__r.Name : '—',
            amount: r.Amount__c,
            reason: r.Reason__c
        }));
    }

    get canceledRows() {
        return this.canceled.map((sub) => {
            const insight = this.insightBySubscription.get(sub.Id);
            return {
                id: sub.Id,
                name: sub.Name,
                customer: sub.Customer_Name__c,
                plan: sub.Plan_Name__c,
                cancelReason: sub.Cancel_Reason__c,
                busy: this.busySubscriptionId === sub.Id,
                hasInsight: !!insight,
                riskLevel: insight ? insight.Risk_Level__c : null,
                riskClass: insight ? `risk risk_${insight.Risk_Level__c.toLowerCase()}` : '',
                analysis: insight ? insight.Analysis__c : '',
                action: insight ? insight.Recommended_Action__c : ''
            };
        });
    }

    get hasInvoices() { return this.invoiceRows.length > 0; }
    get hasRefunds() { return this.refundRows.length > 0; }
    get hasCanceled() { return this.canceledRows.length > 0; }

    get liveLabel() {
        if (this.liveState === 'live') return 'Live';
        if (this.liveState === 'error') return 'Live updates unavailable';
        return 'Connecting…';
    }

    get liveClass() {
        if (this.liveState === 'live') return 'live-dot live-on';
        if (this.liveState === 'error') return 'live-dot live-error';
        return 'live-dot';
    }
}
