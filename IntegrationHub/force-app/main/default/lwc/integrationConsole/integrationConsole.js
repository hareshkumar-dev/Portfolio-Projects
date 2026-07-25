import { LightningElement, wire } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import getSummary from '@salesforce/apex/IntegrationConsoleController.getSummary';
import getRecentLogs from '@salesforce/apex/IntegrationConsoleController.getRecentLogs';

const OUTCOME_CLASS = {
    Success: 'outcome outcome_ok',
    Duplicate: 'outcome outcome_warn',
    Error: 'outcome outcome_bad'
};

export default class IntegrationConsole extends LightningElement {
    wiredSummary;
    wiredLogs;
    summary = { receivedToday: 0, duplicatesBlocked: 0, errors: 0, totalOrders: 0 };
    rows = [];

    @wire(getSummary)
    summaryWire(value) {
        this.wiredSummary = value;
        if (value.data) this.summary = value.data;
    }

    @wire(getRecentLogs)
    logsWire(value) {
        this.wiredLogs = value;
        if (value.data) {
            this.rows = value.data.map((l) => ({
                id: l.Id,
                requestId: l.Request_Id__c,
                endpoint: l.Endpoint__c,
                method: l.Http_Method__c,
                statusCode: l.Status_Code__c,
                outcome: l.Outcome__c,
                outcomeClass: OUTCOME_CLASS[l.Outcome__c] || 'outcome outcome_ok',
                message: l.Message__c,
                orderId: l.Order__r ? l.Order__r.External_Order_Id__c : '—',
                when: new Date(l.Logged_At__c).toLocaleString()
            }));
        }
    }

    get tiles() {
        return [
            { key: 'received', label: 'Orders Received Today', value: this.summary.receivedToday, theme: 'kpi kpi_ok' },
            { key: 'duplicates', label: 'Duplicates Blocked Today', value: this.summary.duplicatesBlocked, theme: 'kpi kpi_warn' },
            { key: 'errors', label: 'Errors Today', value: this.summary.errors, theme: 'kpi kpi_bad' },
            { key: 'total', label: 'Total Orders', value: this.summary.totalOrders, theme: 'kpi kpi_neutral' }
        ];
    }

    get hasRows() {
        return this.rows.length > 0;
    }

    async refresh() {
        await Promise.all([refreshApex(this.wiredSummary), refreshApex(this.wiredLogs)]);
    }
}
