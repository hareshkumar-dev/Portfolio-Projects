import { LightningElement, wire, track } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import getClaims from '@salesforce/apex/ClaimConsoleController.getClaims';
import getSummary from '@salesforce/apex/ClaimConsoleController.getSummary';
import getHistory from '@salesforce/apex/ClaimConsoleController.getHistory';
import advanceStage from '@salesforce/apex/ClaimConsoleController.advanceStage';
import runAgingNow from '@salesforce/apex/ClaimConsoleController.runAgingNow';

const MAIN_STAGES = ['FNOL', 'Investigation', 'Approval', 'Settlement', 'Closed'];
const STAGE_OPTIONS = ['FNOL', 'Investigation', 'Approval', 'Settlement', 'Closed', 'Rejected']
    .map((s) => ({ label: s, value: s }));
const SEV_CLASS = {
    Critical: 'sev sev_critical', High: 'sev sev_high', Medium: 'sev sev_medium', Low: 'sev sev_low'
};

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export default class ClaimConsole extends LightningElement {
    stageOptions = STAGE_OPTIONS;
    busy = false;

    wiredClaims;
    wiredSummary;
    summary = { open: 0, settled: 0, rejected: 0, stalled: 0 };
    cards = [];

    showAdvance = false;
    advanceClaimId;
    advanceClaimName;
    targetStage = 'Investigation';

    @track history = [];
    historyClaimName;
    showHistory = false;

    @wire(getSummary)
    summaryWire(value) {
        this.wiredSummary = value;
        if (value.data) this.summary = value.data;
    }

    @wire(getClaims)
    claimsWire(value) {
        this.wiredClaims = value;
        if (value.data) {
            this.cards = value.data.map((c) => {
                const rejected = c.Stage__c === 'Rejected';
                const curIdx = MAIN_STAGES.indexOf(c.Stage__c);
                const steps = MAIN_STAGES.map((s, i) => {
                    let cls = 'step step_todo';
                    if (rejected) cls = 'step step_muted';
                    else if (i < curIdx) cls = 'step step_done';
                    else if (i === curIdx) cls = 'step step_current';
                    return { key: c.Id + s, label: s, cls };
                });
                return {
                    id: c.Id,
                    name: c.Name,
                    claimant: c.Claimant_Name__c,
                    type: c.Claim_Type__c,
                    severity: c.Severity__c,
                    sevClass: SEV_CLASS[c.Severity__c] || 'sev sev_low',
                    reserve: money.format(c.Reserve_Amount__c || 0),
                    assigned: c.Assigned_To__c || 'Unassigned',
                    stalled: c.Is_Stalled__c,
                    rejected,
                    cardClass: rejected ? 'claim-card card_rejected'
                        : c.Stage__c === 'Closed' ? 'claim-card card_closed' : 'claim-card',
                    steps
                };
            });
        }
    }

    get tiles() {
        return [
            { key: 'o', label: 'Open', value: this.summary.open, theme: 'kpi kpi_violet' },
            { key: 's', label: 'Settled', value: this.summary.settled, theme: 'kpi kpi_green' },
            { key: 'r', label: 'Rejected', value: this.summary.rejected, theme: 'kpi kpi_red' },
            { key: 'x', label: 'Stalled', value: this.summary.stalled, theme: 'kpi kpi_amber' }
        ];
    }

    get hasRows() { return this.cards.length > 0; }
    get hasHistory() { return this.history.length > 0; }

    handleAdvance(event) {
        const id = event.currentTarget.dataset.id;
        const card = this.cards.find((c) => c.id === id);
        this.advanceClaimId = id;
        this.advanceClaimName = `${card.name} · ${card.claimant}`;
        this.targetStage = 'Investigation';
        this.showAdvance = true;
    }

    handleStageChange(event) { this.targetStage = event.detail.value; }

    async confirmAdvance() {
        this.busy = true;
        try {
            await advanceStage({ claimId: this.advanceClaimId, toStage: this.targetStage });
            this.showAdvance = false;
            this.toast('Claim advanced.', 'success');
            await this.refresh();
        } catch (e) {
            this.toast(this.errorOf(e), 'error'); // FSM rejection lands here
        } finally {
            this.busy = false;
        }
    }

    closeAdvance() { this.showAdvance = false; }

    async handleHistory(event) {
        const id = event.currentTarget.dataset.id;
        const card = this.cards.find((c) => c.id === id);
        try {
            const data = await getHistory({ claimId: id });
            this.history = data.map((h) => ({
                id: h.Id,
                from: h.From_Stage__c || '—',
                to: h.To_Stage__c,
                by: h.Changed_By__c,
                at: h.Changed_At__c ? new Date(h.Changed_At__c).toLocaleString() : ''
            }));
            this.historyClaimName = `${card.name} · ${card.claimant}`;
            this.showHistory = true;
        } catch (e) {
            this.toast(this.errorOf(e), 'error');
        }
    }

    closeHistory() { this.showHistory = false; }

    async handleRunAging() {
        this.busy = true;
        try {
            await runAgingNow();
            this.toast('Aging sweep started — refresh shortly to see stalled flags.', 'success');
        } catch (e) {
            this.toast(this.errorOf(e), 'error');
        } finally {
            this.busy = false;
        }
    }

    async refresh() {
        await Promise.all([refreshApex(this.wiredClaims), refreshApex(this.wiredSummary)]);
    }

    toast(message, variant) {
        this.dispatchEvent(new ShowToastEvent({ message, variant }));
    }

    errorOf(e) {
        return (e && e.body && e.body.message) || 'Something went wrong.';
    }
}
