import { LightningElement, wire } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import getWorkOrders from '@salesforce/apex/DispatchConsoleController.getWorkOrders';
import getTechnicians from '@salesforce/apex/DispatchConsoleController.getTechnicians';
import getSummary from '@salesforce/apex/DispatchConsoleController.getSummary';
import reassign from '@salesforce/apex/DispatchConsoleController.reassign';
import runRebalance from '@salesforce/apex/DispatchConsoleController.runRebalance';

const STATUS_META = {
    Unassigned:   { pill: 'pill pill_unassigned', accent: 'accent_unassigned' },
    Assigned:     { pill: 'pill pill_assigned',   accent: 'accent_assigned' },
    'In Progress':{ pill: 'pill pill_progress',   accent: 'accent_progress' },
    Completed:    { pill: 'pill pill_done',       accent: 'accent_done' },
    Cancelled:    { pill: 'pill pill_done',       accent: 'accent_done' }
};

function initials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export default class DispatchConsole extends LightningElement {
    busy = false;

    wiredWO;
    wiredSummary;
    wiredTechs;
    summary = { unassigned: 0, assigned: 0, inProgress: 0, completed: 0 };
    woCards = [];
    techCards = [];
    techOptions = [];

    // Reassign modal
    showReassign = false;
    reassignWoId;
    reassignWoName;
    selectedTechId;

    @wire(getSummary)
    summaryWire(value) {
        this.wiredSummary = value;
        if (value.data) this.summary = value.data;
    }

    @wire(getWorkOrders)
    woWire(value) {
        this.wiredWO = value;
        if (value.data) {
            this.woCards = value.data.map((w) => {
                const meta = STATUS_META[w.Status__c] || STATUS_META.Assigned;
                const tech = w.Assigned_Technician__r ? w.Assigned_Technician__r.Name : null;
                return {
                    id: w.Id,
                    name: w.Name,
                    subject: w.Subject__c,
                    skill: w.Required_Skill__c,
                    territory: w.Territory__c,
                    status: w.Status__c,
                    pillClass: meta.pill,
                    cardClass: `wo-card ${meta.accent}`,
                    techName: tech || 'Awaiting technician',
                    techInitials: tech ? initials(tech) : '··',
                    hasTech: !!tech,
                    score: w.Match_Score__c,
                    hasScore: w.Match_Score__c != null
                };
            });
        }
    }

    @wire(getTechnicians)
    techWire(value) {
        this.wiredTechs = value;
        if (value.data) {
            this.techCards = value.data.map((t) => {
                const active = t.Active_Jobs__c || 0;
                const max = t.Max_Jobs__c || 0;
                const pct = max ? Math.round((active / max) * 100) : 0;
                let barClass = 'bar-fill bar_ok';
                if (pct >= 100) barClass = 'bar-fill bar_full';
                else if (pct >= 67) barClass = 'bar-fill bar_high';
                const skills = (t.Skills__c || '').split(';').filter(Boolean)
                    .map((s, i) => ({ key: `${t.Id}-${i}`, label: s }));
                return {
                    id: t.Id,
                    name: t.Name,
                    initials: initials(t.Name),
                    territory: t.Territory__c,
                    skills,
                    loadLabel: `${active}/${max}`,
                    barClass,
                    barStyle: `width:${Math.min(pct, 100)}%`,
                    availClass: t.Is_Available__c ? 'dot dot_on' : 'dot dot_off',
                    availLabel: t.Is_Available__c ? 'Available' : 'Off shift',
                    avatarClass: t.Is_Available__c ? 'avatar avatar_on' : 'avatar avatar_off'
                };
            });
            this.techOptions = value.data.map((t) => ({ label: t.Name, value: t.Id }));
        }
    }

    get tiles() {
        return [
            { key: 'u', label: 'Unassigned', value: this.summary.unassigned, theme: 'kpi kpi_red' },
            { key: 'a', label: 'Assigned', value: this.summary.assigned, theme: 'kpi kpi_blue' },
            { key: 'p', label: 'In progress', value: this.summary.inProgress, theme: 'kpi kpi_amber' },
            { key: 'c', label: 'Completed', value: this.summary.completed, theme: 'kpi kpi_green' }
        ];
    }

    get hasWO() { return this.woCards.length > 0; }
    get hasTechs() { return this.techCards.length > 0; }

    handleReassignClick(event) {
        const id = event.currentTarget.dataset.id;
        const card = this.woCards.find((w) => w.id === id);
        this.reassignWoId = id;
        this.reassignWoName = `${card.name} · ${card.subject}`;
        this.selectedTechId = this.techOptions.length ? this.techOptions[0].value : null;
        this.showReassign = true;
    }

    handleTechChange(event) {
        this.selectedTechId = event.detail.value;
    }

    async confirmReassign() {
        if (!this.selectedTechId) return;
        this.busy = true;
        try {
            await reassign({ workOrderId: this.reassignWoId, technicianId: this.selectedTechId });
            this.showReassign = false;
            this.toast('Work order reassigned.', 'success');
            await this.refresh();
        } catch (e) {
            this.toast(this.errorOf(e), 'error');
        } finally {
            this.busy = false;
        }
    }

    closeReassign() { this.showReassign = false; }

    async handleRebalance() {
        this.busy = true;
        try {
            await runRebalance();
            this.toast('Rebalance started — refresh shortly to see the backlog assigned.', 'success');
        } catch (e) {
            this.toast(this.errorOf(e), 'error');
        } finally {
            this.busy = false;
        }
    }

    async refresh() {
        await Promise.all([refreshApex(this.wiredWO), refreshApex(this.wiredSummary), refreshApex(this.wiredTechs)]);
    }

    toast(message, variant) {
        this.dispatchEvent(new ShowToastEvent({ message, variant }));
    }

    errorOf(e) {
        return (e && e.body && e.body.message) || 'Something went wrong.';
    }
}
