import { LightningElement, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getHistory from '@salesforce/apex/CaseCopilotController.getHistory';
import summarizeCase from '@salesforce/apex/CaseCopilotController.summarizeCase';
import draftReply from '@salesforce/apex/CaseCopilotController.draftReply';
import suggestNextAction from '@salesforce/apex/CaseCopilotController.suggestNextAction';

export default class CaseCopilot extends LightningElement {
    @api recordId;
    busy = false;
    busyLabel = '';
    response = '';
    responseType = '';
    history = [];

    connectedCallback() {
        this.loadHistory();
    }

    async loadHistory() {
        try {
            const data = await getHistory({ caseId: this.recordId });
            this.history = (data || []).map((h) => ({
                id: h.Id,
                type: h.Interaction_Type__c,
                response: h.Response__c,
                when: new Date(h.CreatedDate).toLocaleString()
            }));
        } catch (e) {
            // History is a convenience panel; a load failure here is non-fatal.
        }
    }

    async run(label, action, type) {
        this.busy = true;
        this.busyLabel = label;
        this.response = '';
        try {
            const result = await action({ caseId: this.recordId });
            this.response = result;
            this.responseType = type;
            await this.loadHistory();
        } catch (e) {
            this.toast(this.errorOf(e), 'error');
        } finally {
            this.busy = false;
        }
    }

    handleSummarize() { this.run('Summarizing…', summarizeCase, 'Summary'); }
    handleDraftReply() { this.run('Drafting reply…', draftReply, 'Draft Reply'); }
    handleSuggestAction() { this.run('Thinking…', suggestNextAction, 'Suggested Action'); }

    get hasResponse() { return !!this.response; }
    get hasHistory() { return this.history.length > 0; }

    toast(message, variant) {
        this.dispatchEvent(new ShowToastEvent({ message, variant }));
    }

    errorOf(e) {
        return (e && e.body && e.body.message) || 'Something went wrong.';
    }
}
