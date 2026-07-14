import { LightningElement, track, wire } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import getOrders from '@salesforce/apex/OrderController.getOrders';
import getHistory from '@salesforce/apex/OrderController.getHistory';
import updateStatus from '@salesforce/apex/OrderController.updateStatus';

const STATUS_OPTIONS = ['Draft', 'Placed', 'Shipped', 'Delivered', 'Cancelled'];
const STATUS_CLASS = {
    Draft: 'badge badge_draft', Placed: 'badge badge_placed', Shipped: 'badge badge_shipped',
    Delivered: 'badge badge_delivered', Cancelled: 'badge badge_cancelled'
};
const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export default class OrderConsole extends LightningElement {
    statusOptions = STATUS_OPTIONS;

    wiredOrders;
    ordersData = [];

    @track selectedOrder;
    selectedOrderId;
    history = [];

    @wire(getOrders)
    ordersWire(value) {
        this.wiredOrders = value;
        if (value.data) {
            this.ordersData = value.data;
            if (this.selectedOrderId) this.selectedOrder = this.ordersData.find((o) => o.Id === this.selectedOrderId);
        }
    }

    get orderCards() {
        return this.ordersData.map((o) => ({
            id: o.Id,
            name: o.Name,
            customer: o.Customer_Name__c,
            amount: money.format(o.Amount__c || 0),
            status: o.Status__c,
            statusClass: STATUS_CLASS[o.Status__c] || 'badge'
        }));
    }
    get hasOrders() { return this.orderCards.length > 0; }

    /* Detail */
    get showDetail() { return !!this.selectedOrder; }
    get selName() { return this.selectedOrder?.Name; }
    get selCustomer() { return this.selectedOrder?.Customer_Name__c; }
    get selAmount() { return money.format(this.selectedOrder?.Amount__c || 0); }
    get selStatus() { return this.selectedOrder?.Status__c; }
    get selStatusClass() { return STATUS_CLASS[this.selectedOrder?.Status__c] || 'badge'; }

    get historyRows() {
        return this.history.map((h) => ({
            id: h.Id,
            from: h.Old_Status__c || 'New',
            to: h.New_Status__c,
            by: h.Changed_By__c,
            time: h.Event_Time__c ? new Date(h.Event_Time__c).toLocaleString() : ''
        }));
    }
    get hasHistory() { return this.historyRows.length > 0; }

    async handleSelect(event) {
        this.selectedOrderId = event.currentTarget.dataset.id;
        this.selectedOrder = this.ordersData.find((o) => o.Id === this.selectedOrderId);
        await this.loadHistory();
    }

    handleBack() { this.selectedOrder = undefined; this.selectedOrderId = undefined; this.history = []; }

    async loadHistory() {
        if (!this.selectedOrderId) return;
        try { this.history = await getHistory({ orderId: this.selectedOrderId }); }
        catch (e) { this.toast(this.errorOf(e), 'error'); }
    }

    async handleStatusChange(event) {
        const status = event.target.value;
        try {
            await updateStatus({ orderId: this.selectedOrderId, status });
            this.toast('Status changed — a Platform Event was published; refresh to see the new history entry.', 'success');
            await refreshApex(this.wiredOrders);
            this.selectedOrder = this.ordersData.find((o) => o.Id === this.selectedOrderId);
        } catch (e) { this.toast(this.errorOf(e), 'error'); }
    }

    async handleRefresh() {
        await refreshApex(this.wiredOrders);
        if (this.selectedOrderId) {
            await this.loadHistory();
            this.selectedOrder = this.ordersData.find((o) => o.Id === this.selectedOrderId);
        }
    }

    toast(message, variant) { this.dispatchEvent(new ShowToastEvent({ message, variant })); }
    errorOf(e) { return (e && e.body && e.body.message) || 'Something went wrong.'; }
}
