import { LightningElement, wire } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import getSummary from '@salesforce/apex/StockController.getSummary';
import getItems from '@salesforce/apex/StockController.getItems';
import runScanNow from '@salesforce/apex/StockController.runScanNow';

const STATUS_META = {
    'In Stock':     { badge: 'badge badge_ok',   accent: 'accent_ok',   bar: 'bar_ok' },
    'Low Stock':    { badge: 'badge badge_warn', accent: 'accent_warn', bar: 'bar_warn' },
    'Out of Stock': { badge: 'badge badge_bad',  accent: 'accent_bad',  bar: 'bar_bad' }
};
const num = new Intl.NumberFormat('en-IN');

function deriveStatus(qty, reorder) {
    if (qty <= 0) return 'Out of Stock';
    if (qty <= reorder) return 'Low Stock';
    return 'In Stock';
}

export default class StockDashboard extends LightningElement {
    busy = false;

    wiredSummary;
    wiredItems;
    summary = { 'In Stock': 0, 'Low Stock': 0, 'Out of Stock': 0, Total: 0 };
    items = [];

    @wire(getSummary)
    summaryWire(value) {
        this.wiredSummary = value;
        if (value.data) this.summary = value.data;
    }

    @wire(getItems)
    itemsWire(value) {
        this.wiredItems = value;
        if (value.data) {
            this.items = value.data.map((r) => {
                const qty = r.Quantity_On_Hand__c || 0;
                const reorder = r.Reorder_Point__c || 0;
                const status = r.Stock_Status__c || deriveStatus(qty, reorder);
                const meta = STATUS_META[status] || STATUS_META['In Stock'];
                // Bar: reorder point sits at 50% of the track (reference = reorder*2).
                const pct = Math.min(100, Math.round((qty / Math.max(reorder * 2, 1)) * 100));
                return {
                    id: r.Id,
                    name: r.Name,
                    sku: r.SKU__c,
                    category: r.Category__c,
                    qty: num.format(qty),
                    reorder: num.format(reorder),
                    cost: r.Unit_Cost__c != null ? num.format(r.Unit_Cost__c) : '—',
                    status,
                    badgeClass: meta.badge,
                    cardClass: `item-card ${meta.accent}`,
                    barFillClass: `bar-fill ${meta.bar}`,
                    barStyle: `width:${pct}%`
                };
            });
        }
    }

    get tiles() {
        return [
            { key: 'total', label: 'Total items', value: this.summary.Total, theme: 'kpi kpi_slate' },
            { key: 'in', label: 'In stock', value: this.summary['In Stock'], theme: 'kpi kpi_green' },
            { key: 'low', label: 'Low stock', value: this.summary['Low Stock'], theme: 'kpi kpi_amber' },
            { key: 'out', label: 'Out of stock', value: this.summary['Out of Stock'], theme: 'kpi kpi_red' }
        ];
    }

    get hasItems() { return this.items.length > 0; }

    async handleRefresh() {
        await Promise.all([refreshApex(this.wiredSummary), refreshApex(this.wiredItems)]);
    }

    async handleRunScan() {
        this.busy = true;
        try {
            await runScanNow();
            this.toast('Stock scan started — refresh in a moment to see updated levels.', 'success');
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
