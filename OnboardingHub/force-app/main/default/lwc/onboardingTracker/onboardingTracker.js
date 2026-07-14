import { LightningElement, track, wire } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import getNewHires from '@salesforce/apex/OnboardingController.getNewHires';
import getTasks from '@salesforce/apex/OnboardingController.getTasks';
import updateTaskStatus from '@salesforce/apex/OnboardingController.updateTaskStatus';
import createNewHire from '@salesforce/apex/OnboardingController.createNewHire';

const DEPARTMENTS = ['Engineering', 'Sales', 'Marketing', 'HR', 'Operations', 'Other'];

function initials(name) {
    if (!name) return '?';
    const p = name.trim().split(/\s+/);
    return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}
function barClassFor(pct) {
    if (pct >= 100) return 'bar-fill bar_done';
    if (pct >= 50) return 'bar-fill bar_mid';
    return 'bar-fill bar_low';
}

export default class OnboardingTracker extends LightningElement {
    departmentOptions = DEPARTMENTS;

    wiredHires;
    hiresData = [];

    @track selectedHire;
    selectedHireId;
    tasks = [];

    showForm = false;
    form = { name: '', startDate: null, department: 'Engineering', role: '', email: '' };

    @wire(getNewHires)
    hiresWire(value) {
        this.wiredHires = value;
        if (value.data) this.hiresData = value.data;
    }

    get hireCards() {
        return this.hiresData.map((h) => {
            const pct = Math.round(h.Completion_Percent__c || 0);
            return {
                id: h.Id,
                name: h.Name,
                initials: initials(h.Name),
                dept: h.Department__c,
                role: h.Role__c,
                status: h.Status__c,
                pct,
                barStyle: `width:${pct}%`,
                barClass: barClassFor(pct),
                pctLabel: `${pct}%`
            };
        });
    }
    get hasHires() { return this.hireCards.length > 0; }

    /* ---------- Detail ---------- */
    get showDetail() { return !!this.selectedHire; }
    get selName() { return this.selectedHire?.Name; }
    get selInitials() { return initials(this.selectedHire?.Name); }
    get selRole() { return this.selectedHire?.Role__c || '—'; }
    get selDept() { return this.selectedHire?.Department__c; }
    get selPct() { return Math.round(this.selectedHire?.Completion_Percent__c || 0); }
    get selPctLabel() { return `${this.selPct}%`; }
    get selBarStyle() { return `width:${this.selPct}%`; }
    get selBarClass() { return barClassFor(this.selPct); }

    get taskRows() {
        return this.tasks.map((t) => {
            const done = t.Status__c === 'Completed';
            return {
                id: t.Id,
                subject: t.Subject__c,
                category: t.Category__c,
                done,
                rowClass: done ? 'task-row done' : 'task-row',
                checkClass: done ? 'check checked' : 'check',
                due: t.Due_Date__c ? new Date(t.Due_Date__c).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''
            };
        });
    }
    get hasTasks() { return this.taskRows.length > 0; }
    get doneCount() { return this.tasks.filter((t) => t.Status__c === 'Completed').length; }

    /* ---------- New hire form ---------- */
    openForm() { this.showForm = true; }
    closeForm() {
        this.showForm = false;
        this.form = { name: '', startDate: null, department: 'Engineering', role: '', email: '' };
    }
    handleFormChange(event) {
        const { name, value } = event.target;
        this.form = { ...this.form, [name]: value };
    }

    async handleCreateHire() {
        if (!this.form.name) { this.toast('Enter the employee name.', 'warning'); return; }
        try {
            await createNewHire({
                name: this.form.name, startDate: this.form.startDate,
                department: this.form.department, role: this.form.role, email: this.form.email
            });
            this.closeForm();
            await refreshApex(this.wiredHires);
            this.toast('New hire added — onboarding checklist created automatically.', 'success');
        } catch (e) { this.toast(this.errorOf(e), 'error'); }
    }

    /* ---------- Selection + checklist ---------- */
    async handleSelectHire(event) {
        this.selectedHireId = event.currentTarget.dataset.id;
        this.selectedHire = this.hiresData.find((h) => h.Id === this.selectedHireId);
        await this.loadTasks();
    }

    async loadTasks() {
        if (!this.selectedHireId) return;
        try { this.tasks = await getTasks({ hireId: this.selectedHireId }); }
        catch (e) { this.toast(this.errorOf(e), 'error'); }
    }

    handleBack() { this.selectedHire = undefined; this.selectedHireId = undefined; this.tasks = []; }

    async handleToggleTask(event) {
        const taskId = event.currentTarget.dataset.id;
        const task = this.tasks.find((t) => t.Id === taskId);
        const nextStatus = task.Status__c === 'Completed' ? 'Not Started' : 'Completed';
        try {
            await updateTaskStatus({ taskId, status: nextStatus });
            await this.loadTasks();
            await refreshApex(this.wiredHires);
            this.selectedHire = this.hiresData.find((h) => h.Id === this.selectedHireId);
        } catch (e) { this.toast(this.errorOf(e), 'error'); }
    }

    async handleRefresh() {
        try {
            if (this.selectedHireId) await this.loadTasks();
            await refreshApex(this.wiredHires);
            if (this.selectedHireId) this.selectedHire = this.hiresData.find((h) => h.Id === this.selectedHireId);
        } catch (e) { this.toast(this.errorOf(e), 'error'); }
    }

    toast(message, variant) { this.dispatchEvent(new ShowToastEvent({ message, variant })); }
    errorOf(e) { return (e && e.body && e.body.message) || 'Something went wrong.'; }
}
