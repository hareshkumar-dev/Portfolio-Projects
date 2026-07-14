import { LightningElement, wire, track } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import getApplications from '@salesforce/apex/LoanConsoleController.getApplications';
import getSummary from '@salesforce/apex/LoanConsoleController.getSummary';
import getAudits from '@salesforce/apex/LoanConsoleController.getAudits';
import submitApp from '@salesforce/apex/LoanConsoleController.submit';

const DECISION_META = {
    'Auto-Approved': { badge: 'badge badge_ok',   icon: 'utility:success' },
    'Referred':      { badge: 'badge badge_warn', icon: 'utility:clock' },
    'Declined':      { badge: 'badge badge_bad',  icon: 'utility:error' }
};
const PENDING_META = { badge: 'badge badge_pending', icon: 'utility:hourglass' };

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function scoreClass(score) {
    if (score == null) return 'score-num score_pending';
    if (score >= 70) return 'score-num score_ok';
    if (score >= 40) return 'score-num score_warn';
    return 'score-num score_bad';
}

export default class LoanConsole extends LightningElement {
    busy = false;

    wiredApps;
    wiredSummary;
    summary = { total: 0, approved: 0, referred: 0, declined: 0 };
    cards = [];

    @track audits = [];
    auditAppName;
    showAudit = false;

    @wire(getSummary)
    summaryWire(value) {
        this.wiredSummary = value;
        if (value.data) this.summary = value.data;
    }

    @wire(getApplications)
    appsWire(value) {
        this.wiredApps = value;
        if (value.data) {
            this.cards = value.data.map((a) => {
                const decided = !!a.Decision__c;
                const meta = decided ? (DECISION_META[a.Decision__c] || PENDING_META) : PENDING_META;
                const score = a.Risk_Score__c;
                return {
                    id: a.Id,
                    name: a.Name,
                    applicant: a.Applicant_Name__c,
                    decision: decided ? a.Decision__c : 'Pending',
                    badgeClass: meta.badge,
                    decisionIcon: meta.icon,
                    hasScore: score != null,
                    score,
                    scoreNumClass: scoreClass(score),
                    markerStyle: `left:${Math.max(0, Math.min(100, score || 0))}%`,
                    amount: money.format(a.Loan_Amount__c || 0),
                    credit: a.Credit_Score__c,
                    income: money.format(a.Annual_Income__c || 0),
                    reason: a.Decision_Reason__c,
                    isDraft: a.Status__c === 'Draft'
                };
            });
        }
    }

    get tiles() {
        return [
            { key: 't', label: 'Applications', value: this.summary.total, theme: 'kpi kpi_neutral' },
            { key: 'a', label: 'Auto-approved', value: this.summary.approved, theme: 'kpi kpi_green' },
            { key: 'r', label: 'Referred', value: this.summary.referred, theme: 'kpi kpi_amber' },
            { key: 'd', label: 'Declined', value: this.summary.declined, theme: 'kpi kpi_red' }
        ];
    }

    get hasRows() { return this.cards.length > 0; }

    async handleSubmit(event) {
        const id = event.currentTarget.dataset.id;
        this.busy = true;
        try {
            await submitApp({ applicationId: id });
            this.toast('Application submitted — the engine scored and decided it.', 'success');
            await this.refresh();
        } catch (e) {
            this.toast(this.errorOf(e), 'error');
        } finally {
            this.busy = false;
        }
    }

    async handleAudit(event) {
        const id = event.currentTarget.dataset.id;
        const card = this.cards.find((c) => c.id === id);
        try {
            const data = await getAudits({ applicationId: id });
            this.audits = data.map((au) => ({
                id: au.Id,
                score: au.Risk_Score__c,
                decision: au.Decision__c,
                reason: au.Reason__c,
                by: au.Decided_By__c,
                at: au.Decided_At__c ? new Date(au.Decided_At__c).toLocaleString() : ''
            }));
            this.auditAppName = `${card.name} · ${card.applicant}`;
            this.showAudit = true;
        } catch (e) {
            this.toast(this.errorOf(e), 'error');
        }
    }

    get hasAudits() { return this.audits.length > 0; }

    closeAudit() { this.showAudit = false; }

    async refresh() {
        await Promise.all([refreshApex(this.wiredApps), refreshApex(this.wiredSummary)]);
    }

    toast(message, variant) {
        this.dispatchEvent(new ShowToastEvent({ message, variant }));
    }

    errorOf(e) {
        return (e && e.body && e.body.message) || 'Something went wrong.';
    }
}
