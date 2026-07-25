import { LightningElement, wire } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import getProducts from '@salesforce/apex/QuoteEngineController.getProducts';
import getBundles from '@salesforce/apex/QuoteEngineController.getBundles';
import getQuotes from '@salesforce/apex/QuoteEngineController.getQuotes';
import getQuoteLines from '@salesforce/apex/QuoteEngineController.getQuoteLines';
import getPendingApprovals from '@salesforce/apex/QuoteEngineController.getPendingApprovals';
import createQuote from '@salesforce/apex/QuoteEngineController.createQuote';
import addProductLine from '@salesforce/apex/QuoteEngineController.addProductLine';
import addBundleLine from '@salesforce/apex/QuoteEngineController.addBundleLine';
import submitForApproval from '@salesforce/apex/QuoteEngineController.submitForApproval';
import decideQuote from '@salesforce/apex/QuoteEngineController.decideQuote';

const STATUS_CLASS = {
    Draft: 'status status_draft',
    'Pending Approval': 'status status_pending',
    Approved: 'status status_approved',
    Rejected: 'status status_rejected'
};

export default class QuoteEngineConsole extends LightningElement {
    customerName = '';
    selectedQuoteId;
    selectedProductId;
    selectedBundleId;
    productQuantity = 1;
    bundleQuantity = 1;
    showModal = false;
    showCreateModal = false;

    products = [];
    bundles = [];
    wiredQuotesResult;
    quotes = [];
    lines = [];
    pendingApprovals = [];

    connectedCallback() {
        this.loadStaticData();
        this.loadPending();
    }

    async loadStaticData() {
        try {
            this.products = await getProducts();
            this.bundles = await getBundles();
        } catch (e) {
            // non-fatal
        }
    }

    @wire(getQuotes)
    quotesWire(value) {
        this.wiredQuotesResult = value;
        if (value.data) this.quotes = value.data;
    }

    async loadPending() {
        try {
            this.pendingApprovals = await getPendingApprovals();
        } catch (e) {
            // non-fatal
        }
    }

    async loadLines() {
        if (!this.selectedQuoteId) return;
        try {
            this.lines = await getQuoteLines({ quoteId: this.selectedQuoteId });
        } catch (e) {
            // non-fatal
        }
    }

    async refreshAll() {
        await Promise.all([refreshApex(this.wiredQuotesResult), this.loadLines(), this.loadPending()]);
    }

    handleCustomerNameChange(event) {
        this.customerName = event.target.value;
    }

    handleProductQuantityChange(event) {
        this.productQuantity = Number(event.target.value) || 1;
    }

    handleBundleQuantityChange(event) {
        this.bundleQuantity = Number(event.target.value) || 1;
    }

    handleProductChange(event) {
        this.selectedProductId = event.detail.value;
    }

    handleBundleChange(event) {
        this.selectedBundleId = event.detail.value;
    }

    handleOpenCreateModal() {
        this.customerName = '';
        this.showCreateModal = true;
    }

    handleCloseCreateModal() {
        this.showCreateModal = false;
        this.customerName = '';
    }

    async handleCreateQuote() {
        if (!this.customerName) {
            this.toast('Enter a customer name first.', 'error');
            return;
        }
        try {
            const quoteId = await createQuote({ customerName: this.customerName });
            this.customerName = '';
            this.showCreateModal = false;
            await this.refreshAll();
            this.toast('Quote created.', 'success');
            this.openModal(quoteId);
        } catch (e) {
            this.toast(this.errorOf(e), 'error');
        }
    }

    handleSelectQuote(event) {
        this.openModal(event.currentTarget.dataset.id);
    }

    openModal(quoteId) {
        this.selectedQuoteId = quoteId;
        this.showModal = true;
        this.selectedProductId = undefined;
        this.selectedBundleId = undefined;
        this.productQuantity = 1;
        this.bundleQuantity = 1;
        this.loadLines();
    }

    handleCloseModal() {
        this.showModal = false;
        this.selectedQuoteId = undefined;
        this.lines = [];
    }

    async handleAddProduct() {
        if (!this.selectedQuoteId || !this.selectedProductId) {
            this.toast('Select a product first.', 'error');
            return;
        }
        try {
            await addProductLine({ quoteId: this.selectedQuoteId, productId: this.selectedProductId, quantity: this.productQuantity });
            await this.refreshAll();
            this.toast('Product added.', 'success');
        } catch (e) {
            this.toast(this.errorOf(e), 'error');
        }
    }

    async handleAddBundle() {
        if (!this.selectedQuoteId || !this.selectedBundleId) {
            this.toast('Select a bundle first.', 'error');
            return;
        }
        try {
            await addBundleLine({ quoteId: this.selectedQuoteId, bundleId: this.selectedBundleId, quantity: this.bundleQuantity });
            await this.refreshAll();
            this.toast('Bundle added.', 'success');
        } catch (e) {
            this.toast(this.errorOf(e), 'error');
        }
    }

    async handleSubmit() {
        if (!this.selectedQuoteId) return;
        try {
            await submitForApproval({ quoteId: this.selectedQuoteId });
            await this.refreshAll();
            this.toast('Quote submitted.', 'success');
        } catch (e) {
            this.toast(this.errorOf(e), 'error');
        }
    }

    async handleApprove(event) {
        await this.decide(event.currentTarget.dataset.id, true);
    }

    async handleReject(event) {
        await this.decide(event.currentTarget.dataset.id, false);
    }

    async decide(quoteId, approve) {
        try {
            await decideQuote({ quoteId, approve, notes: approve ? 'Approved from console.' : 'Rejected from console.' });
            await this.refreshAll();
            this.toast(approve ? 'Quote approved.' : 'Quote rejected.', 'success');
        } catch (e) {
            this.toast(this.errorOf(e), 'error');
        }
    }

    handleViewPdf(event) {
        event.stopPropagation();
        const quoteId = event.currentTarget.dataset.id;
        window.open('/apex/QuotePdf?id=' + quoteId, '_blank');
    }

    toast(message, variant) {
        this.dispatchEvent(new ShowToastEvent({ message, variant }));
    }

    errorOf(e) {
        return (e && e.body && e.body.message) || 'Something went wrong.';
    }

    get productOptions() {
        return this.products.map((p) => ({ label: `${p.Name} — $${p.Unit_Price__c}`, value: p.Id }));
    }

    get bundleOptions() {
        return this.bundles.map((b) => ({ label: `${b.Name} (${b.Bundle_Discount_Percent__c}% off)`, value: b.Id }));
    }

    get quoteRows() {
        return this.quotes.map((q) => ({
            id: q.Id,
            name: q.Name,
            customer: q.Customer_Name__c,
            status: q.Status__c,
            statusClass: STATUS_CLASS[q.Status__c] || 'status status_draft',
            subtotal: q.Subtotal__c,
            discount: q.Discount_Percent__c,
            total: q.Total__c,
            isApproved: q.Status__c === 'Approved'
        }));
    }

    get modalQuote() {
        const q = this.quotes.find((r) => r.Id === this.selectedQuoteId);
        if (!q) {
            return { name: '', customer: '', status: '', statusClass: 'status status_draft', subtotal: 0, discount: 0, total: 0, isDraft: false, isApproved: false };
        }
        return {
            name: q.Name,
            customer: q.Customer_Name__c,
            status: q.Status__c,
            statusClass: STATUS_CLASS[q.Status__c] || 'status status_draft',
            subtotal: q.Subtotal__c,
            discount: q.Discount_Percent__c,
            total: q.Total__c,
            isDraft: q.Status__c === 'Draft',
            isApproved: q.Status__c === 'Approved'
        };
    }

    get canSubmit() {
        return this.modalQuote.isDraft && this.hasLines;
    }

    get lineRows() {
        return this.lines.map((l) => ({ id: l.Id, name: l.Line_Name__c, qty: l.Quantity__c, unitPrice: l.Unit_Price__c, total: l.Line_Total__c }));
    }

    get pendingRows() {
        return this.pendingApprovals.map((q) => ({ id: q.Id, name: q.Name, customer: q.Customer_Name__c, discount: q.Discount_Percent__c, total: q.Total__c }));
    }

    get hasQuotes() { return this.quoteRows.length > 0; }
    get hasLines() { return this.lineRows.length > 0; }
    get hasPending() { return this.pendingRows.length > 0; }
}
