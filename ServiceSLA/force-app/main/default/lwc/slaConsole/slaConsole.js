import { LightningElement, wire } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import getSummary from '@salesforce/apex/SlaConsoleController.getSummary';
import getOpenCases from '@salesforce/apex/SlaConsoleController.getOpenCases';
import runEscalationNow from '@salesforce/apex/SlaConsoleController.runEscalationNow';

const STATUS_META = {
    'On Track':            { pill: 'pill pill_ok',   accent: 'accent_ok',   icon: 'utility:check' },
    'Met':                 { pill: 'pill pill_ok',   accent: 'accent_ok',   icon: 'utility:success' },
    'Response Breached':   { pill: 'pill pill_warn', accent: 'accent_warn', icon: 'utility:clock' },
    'Resolution Breached': { pill: 'pill pill_bad',  accent: 'accent_bad',  icon: 'utility:error' }
};
const TIER_CLASS = { Platinum: 'tier tier_plat', Gold: 'tier tier_gold', Standard: 'tier tier_std' };
const PRIO_CLASS = { High: 'prio prio_high', Medium: 'prio prio_med', Low: 'prio prio_low' };

function fmtDelta(ms) {
    const m = Math.floor(ms / 60000);
    if (m >= 1440) return `${Math.floor(m / 1440)}d ${Math.floor((m % 1440) / 60)}h`;
    if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
    return `${m}m`;
}

export default class SlaConsole extends LightningElement {
    busy = false;

    wiredSummary;
    wiredCases;
    summary = { open: 0, onTrack: 0, breached: 0, escalated: 0 };
    rows = [];

    @wire(getSummary)
    summaryWire(value) {
        this.wiredSummary = value;
        if (value.data) this.summary = value.data;
    }

    @wire(getOpenCases)
    casesWire(value) {
        this.wiredCases = value;
        if (value.data) {
            const now = Date.now();
            this.rows = value.data.map((c) => {
                const meta = STATUS_META[c.SLA_Status__c] || STATUS_META['On Track'];
                let timeLabel = '—';
                let timeClass = 'time';
                if (c.Resolution_Target__c) {
                    const diff = new Date(c.Resolution_Target__c).getTime() - now;
                    if (diff >= 0) {
                        timeLabel = `Due in ${fmtDelta(diff)}`;
                        timeClass = diff < 3600000 ? 'time time_warn' : 'time time_ok';
                    } else {
                        timeLabel = `Overdue ${fmtDelta(-diff)}`;
                        timeClass = 'time time_bad';
                    }
                }
                return {
                    id: c.Id,
                    number: c.CaseNumber,
                    subject: c.Subject,
                    tier: c.Service_Tier__c,
                    tierClass: TIER_CLASS[c.Service_Tier__c] || 'tier tier_std',
                    priority: c.Priority,
                    prioClass: PRIO_CLASS[c.Priority] || 'prio prio_low',
                    status: c.SLA_Status__c,
                    pillClass: meta.pill,
                    rowClass: `case-row ${meta.accent}`,
                    statusIcon: meta.icon,
                    escalated: c.Is_Escalated__c,
                    timeLabel,
                    timeClass
                };
            });
        }
    }

    get tiles() {
        return [
            { key: 'open', label: 'Open cases', value: this.summary.open, theme: 'kpi kpi_neutral' },
            { key: 'ontrack', label: 'On track', value: this.summary.onTrack, theme: 'kpi kpi_green' },
            { key: 'breached', label: 'Breached', value: this.summary.breached, theme: 'kpi kpi_red' },
            { key: 'escalated', label: 'Escalated', value: this.summary.escalated, theme: 'kpi kpi_amber' }
        ];
    }

    get hasRows() { return this.rows.length > 0; }
    get hasBreaches() { return this.summary.breached > 0; }
    get breachText() {
        const n = this.summary.breached;
        return `${n} ${n === 1 ? 'case has' : 'cases have'} breached their SLA target and need attention.`;
    }

    async refresh() {
        await Promise.all([refreshApex(this.wiredSummary), refreshApex(this.wiredCases)]);
    }

    async handleRunEscalation() {
        this.busy = true;
        try {
            await runEscalationNow();
            this.toast('SLA sweep started. It runs in the background — refresh shortly to see updates.', 'success');
        } catch (e) {
            this.toast(this.errorOf(e), 'error');
        } finally {
            this.busy = false;
        }
    }

    toast(message, variant) {
        this.dispatchEvent(new ShowToastEvent({ message, variant }));
    }

    errorOf(e) {
        return (e && e.body && e.body.message) || 'Something went wrong.';
    }
}
