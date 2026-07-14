import { LightningElement, wire } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import getMetrics from '@salesforce/apex/RevenueDashboardController.getMetrics';
import getSubscriptions from '@salesforce/apex/RevenueDashboardController.getSubscriptions';
import activateRenewal from '@salesforce/apex/RevenueDashboardController.activateRenewal';
import runRenewalSweep from '@salesforce/apex/RevenueDashboardController.runRenewalSweep';

const STATUS_META = {
    'Active':           { pill: 'pill pill_active',  accent: 'accent_active' },
    'Pending Renewal':  { pill: 'pill pill_pending', accent: 'accent_pending' },
    'Churned':          { pill: 'pill pill_churned', accent: 'accent_churned' },
    'Renewed':          { pill: 'pill pill_renewed', accent: 'accent_renewed' }
};

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export default class RevenueDashboard extends LightningElement {
    busy = false;

    wiredMetrics;
    wiredSubs;
    metrics = { totalMrr: 0, arr: 0, activeCount: 0, renewalsDue: 0, pendingRenewals: 0, churned: 0 };
    rows = [];

    @wire(getMetrics)
    metricsWire(value) {
        this.wiredMetrics = value;
        if (value.data) this.metrics = value.data;
    }

    @wire(getSubscriptions)
    subsWire(value) {
        this.wiredSubs = value;
        if (value.data) {
            const now = Date.now();
            this.rows = value.data.map((s) => {
                const meta = STATUS_META[s.Status__c] || STATUS_META.Active;
                let daysLabel = '';
                if (s.End_Date__c) {
                    const days = Math.ceil((new Date(s.End_Date__c).getTime() - now) / 86400000);
                    daysLabel = days >= 0 ? `Renews in ${days}d` : `Expired ${-days}d ago`;
                }
                return {
                    id: s.Id,
                    name: s.Name,
                    customer: s.Customer__r ? s.Customer__r.Name : '—',
                    product: s.Product__c,
                    mrr: money.format(s.MRR__c || 0),
                    status: s.Status__c,
                    pillClass: meta.pill,
                    rowClass: `sub-row ${meta.accent}`,
                    daysLabel,
                    isPending: s.Status__c === 'Pending Renewal'
                };
            });
        }
    }

    get heroMrr() { return this.fmt(this.metrics.totalMrr); }
    get heroArr() { return this.fmt(this.metrics.arr); }

    get tiles() {
        return [
            { key: 'act', label: 'Active subs', value: this.metrics.activeCount, theme: 'kpi kpi_sky' },
            { key: 'due', label: 'Renewals due', value: this.metrics.renewalsDue, theme: 'kpi kpi_amber' },
            { key: 'pend', label: 'Pending renewals', value: this.metrics.pendingRenewals, theme: 'kpi kpi_violet' },
            { key: 'chn', label: 'Churned', value: this.metrics.churned, theme: 'kpi kpi_red' }
        ];
    }

    get hasRows() { return this.rows.length > 0; }

    fmt(v) {
        const n = Number(v) || 0;
        if (n >= 1000000) return `$${(n / 1000000).toFixed(2)}M`;
        if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
        return `$${n.toFixed(0)}`;
    }

    async handleActivate(event) {
        const id = event.currentTarget.dataset.id;
        this.busy = true;
        try {
            await activateRenewal({ subscriptionId: id });
            this.toast('Renewal activated — the prior term was retired.', 'success');
            await this.refresh();
        } catch (e) {
            this.toast(this.errorOf(e), 'error');
        } finally {
            this.busy = false;
        }
    }

    async handleRunSweep() {
        this.busy = true;
        try {
            await runRenewalSweep();
            this.toast('Renewal sweep started — refresh shortly to see new renewals and churn.', 'success');
        } catch (e) {
            this.toast(this.errorOf(e), 'error');
        } finally {
            this.busy = false;
        }
    }

    async refresh() {
        await Promise.all([refreshApex(this.wiredMetrics), refreshApex(this.wiredSubs)]);
    }

    toast(message, variant) {
        this.dispatchEvent(new ShowToastEvent({ message, variant }));
    }

    errorOf(e) {
        return (e && e.body && e.body.message) || 'Something went wrong.';
    }
}
