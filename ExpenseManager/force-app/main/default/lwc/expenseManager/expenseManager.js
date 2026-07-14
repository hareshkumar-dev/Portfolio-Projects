import { LightningElement, track, wire } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import getMyReports from '@salesforce/apex/ExpenseController.getMyReports';
import getReport from '@salesforce/apex/ExpenseController.getReport';
import createReport from '@salesforce/apex/ExpenseController.createReport';
import renameReport from '@salesforce/apex/ExpenseController.renameReport';
import deleteReport from '@salesforce/apex/ExpenseController.deleteReport';
import addLine from '@salesforce/apex/ExpenseController.addLine';
import deleteLine from '@salesforce/apex/ExpenseController.deleteLine';
import submitForApproval from '@salesforce/apex/ExpenseController.submitForApproval';

const CATEGORY_OPTIONS = ['Travel', 'Meals', 'Lodging', 'Supplies', 'Other'].map((c) => ({ label: c, value: c }));
const STATUS_META = {
    Draft: 'badge badge_draft',
    Submitted: 'badge badge_submitted',
    Approved: 'badge badge_approved',
    Rejected: 'badge badge_rejected'
};
const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export default class ExpenseManager extends LightningElement {
    categoryOptions = CATEGORY_OPTIONS;

    @track selectedReport;
    selectedReportId;
    newPurpose = '';
    line = { category: 'Travel', amount: null, date: null, merchant: '', notes: '' };

    editingPurpose = false;
    editPurposeValue = '';

    wiredReports;

    @wire(getMyReports)
    reports(value) { this.wiredReports = value; }

    get reportCards() {
        const data = (this.wiredReports && this.wiredReports.data) || [];
        return data.map((r) => ({
            id: r.Id,
            name: r.Name,
            purpose: r.Purpose__c || '(no purpose)',
            status: r.Status__c,
            statusClass: STATUS_META[r.Status__c] || 'badge',
            total: money.format(r.Total_Amount__c || 0),
            date: r.Submitted_Date__c ? new Date(r.Submitted_Date__c).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not submitted'
        }));
    }
    get hasReports() { return this.reportCards.length > 0; }

    /* selected report display */
    get showDetail() { return !!this.selectedReport; }
    get rptStatus() { return this.selectedReport?.Status__c; }
    get rptStatusClass() { return STATUS_META[this.selectedReport?.Status__c] || 'badge'; }
    get rptTotal() { return money.format(this.selectedReport?.Total_Amount__c || 0); }
    get rptPurpose() { return this.selectedReport?.Purpose__c || '(no purpose)'; }
    get rptName() { return this.selectedReport?.Name; }

    get lineRows() {
        const rows = this.selectedReport?.Expense_Lines__r || [];
        return rows.map((l) => ({
            id: l.Id,
            category: l.Category__c,
            merchant: l.Merchant__c || '—',
            date: l.Expense_Date__c ? new Date(l.Expense_Date__c).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '',
            amount: money.format(l.Amount__c || 0)
        }));
    }
    get hasLines() { return this.lineRows.length > 0; }

    get canSubmit() {
        return this.selectedReport && this.selectedReport.Status__c === 'Draft' && this.selectedReport.Total_Amount__c > 0;
    }

    /* ---------- Report creation ---------- */
    handlePurposeChange(event) { this.newPurpose = event.target.value; }

    async handleCreateReport() {
        if (!this.newPurpose) { this.toast('Add a purpose for the report first.', 'warning'); return; }
        try {
            const id = await createReport({ purpose: this.newPurpose });
            this.newPurpose = '';
            await refreshApex(this.wiredReports);
            this.openReport(id);
            this.toast('Report created.', 'success');
        } catch (e) { this.toast(this.errorOf(e), 'error'); }
    }

    /* ---------- Selection ---------- */
    handleSelectReport(event) { this.openReport(event.currentTarget.dataset.id); }

    async openReport(reportId) { this.selectedReportId = reportId; await this.reloadSelected(); }

    async reloadSelected() {
        if (!this.selectedReportId) return;
        try { this.selectedReport = await getReport({ reportId: this.selectedReportId }); }
        catch (e) { this.toast(this.errorOf(e), 'error'); }
    }

    handleBack() { this.selectedReport = undefined; this.selectedReportId = undefined; this.editingPurpose = false; }

    /* ---------- Rename + delete report ---------- */
    handleEditPurpose() {
        this.editPurposeValue = this.selectedReport?.Purpose__c || '';
        this.editingPurpose = true;
    }
    handlePurposeInput(event) { this.editPurposeValue = event.target.value; }
    handleCancelEdit() { this.editingPurpose = false; }

    async handleSavePurpose() {
        const value = (this.editPurposeValue || '').trim();
        if (!value) { this.toast('Purpose cannot be empty.', 'warning'); return; }
        try {
            await renameReport({ reportId: this.selectedReportId, purpose: value });
            this.editingPurpose = false;
            await this.reloadSelected();
            await refreshApex(this.wiredReports);
            this.toast('Report renamed.', 'success');
        } catch (e) { this.toast(this.errorOf(e), 'error'); }
    }

    async handleDeleteReport() {
        // eslint-disable-next-line no-alert
        if (!window.confirm(`Delete report "${this.selectedReport?.Purpose__c}" and all its lines?`)) return;
        try {
            await deleteReport({ reportId: this.selectedReportId });
            this.handleBack();
            await refreshApex(this.wiredReports);
            this.toast('Report deleted.', 'success');
        } catch (e) { this.toast(this.errorOf(e), 'error'); }
    }

    /* ---------- Line editing ---------- */
    handleLineChange(event) {
        const { name, value } = event.target;
        this.line = { ...this.line, [name]: value };
    }

    async handleAddLine() {
        if (!this.line.amount || Number(this.line.amount) <= 0) { this.toast('Enter an amount greater than zero.', 'warning'); return; }
        try {
            await addLine({
                reportId: this.selectedReportId,
                category: this.line.category,
                amount: this.line.amount,
                expenseDate: this.line.date,
                merchant: this.line.merchant,
                notes: this.line.notes
            });
            this.line = { category: 'Travel', amount: null, date: null, merchant: '', notes: '' };
            await this.reloadSelected();
            await refreshApex(this.wiredReports);
            this.toast('Line added — total updated.', 'success');
        } catch (e) { this.toast(this.errorOf(e), 'error'); }
    }

    async handleDeleteLine(event) {
        const id = event.currentTarget.dataset.id;
        // eslint-disable-next-line no-alert
        if (!window.confirm('Delete this expense line?')) return;
        try {
            await deleteLine({ lineId: id });
            await this.reloadSelected();
            await refreshApex(this.wiredReports);
            this.toast('Line deleted — total updated.', 'success');
        } catch (e) { this.toast(this.errorOf(e), 'error'); }
    }

    /** Manual refresh — reloads the open report (if any) and the report list. */
    async handleRefresh() {
        try {
            if (this.selectedReportId) await this.reloadSelected();
            await refreshApex(this.wiredReports);
        } catch (e) { this.toast(this.errorOf(e), 'error'); }
    }

    /* ---------- Submit ---------- */
    async handleSubmit() {
        try {
            const message = await submitForApproval({ reportId: this.selectedReportId });
            await this.reloadSelected();
            await refreshApex(this.wiredReports);
            this.toast(message, 'success');
        } catch (e) { this.toast(this.errorOf(e), 'error'); }
    }

    toast(message, variant) { this.dispatchEvent(new ShowToastEvent({ message, variant })); }
    errorOf(e) { return (e && e.body && e.body.message) || 'Something went wrong.'; }
}
