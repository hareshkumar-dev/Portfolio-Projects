/**
 * QuotePdfController — backs the QuotePdf Visualforce page. Reads the
 * quote id from the page URL and loads the quote plus its lines so the
 * page can render a real, downloadable PDF quote document.
 */
public with sharing class QuotePdfController {

    public class LineRow {
        public String name { get; private set; }
        public Decimal quantity { get; private set; }
        public Decimal unitPrice { get; private set; }
        public Decimal lineTotal { get; private set; }
        public String rowStyle { get; private set; }

        public LineRow(Quote_Line__c line, Boolean odd) {
            name = line.Line_Name__c;
            quantity = line.Quantity__c;
            unitPrice = line.Unit_Price__c;
            lineTotal = line.Line_Total__c;
            rowStyle = odd ? 'background-color:#f4f8fb;' : '';
        }
    }

    public Quote__c quote { get; private set; }
    public List<Quote_Line__c> lines { get; private set; }
    public List<LineRow> lineRows { get; private set; }
    public Datetime generatedOn { get; private set; }

    public String generatedOnFormatted {
        get { return generatedOn.format('MMMM d, yyyy \'at\' h:mm a'); }
    }

    public String quoteDateFormatted {
        get { return quote == null ? '' : quote.CreatedDate.format('MMMM d, yyyy'); }
    }

    public QuotePdfController() {
        generatedOn = Datetime.now();
        String rawId = ApexPages.currentPage().getParameters().get('id');
        Id quoteId = safeId(rawId);
        if (quoteId == null) {
            return;
        }

        List<Quote__c> matches = [
            SELECT Id, Name, Customer_Name__c, Status__c, Subtotal__c, Discount_Percent__c, Total__c, CreatedDate
            FROM Quote__c
            WHERE Id = :quoteId
            WITH SECURITY_ENFORCED
            LIMIT 1
        ];
        if (matches.isEmpty()) {
            return;
        }
        quote = matches[0];

        lines = [
            SELECT Line_Name__c, Quantity__c, Unit_Price__c, Line_Total__c
            FROM Quote_Line__c
            WHERE Quote__c = :quoteId
            WITH SECURITY_ENFORCED
            ORDER BY CreatedDate ASC
        ];

        lineRows = new List<LineRow>();
        for (Integer i = 0; i < lines.size(); i++) {
            lineRows.add(new LineRow(lines[i], Math.mod(i, 2) == 1));
        }
    }

    private static Id safeId(String rawId) {
        if (String.isBlank(rawId)) {
            return null;
        }
        try {
            return (Id) rawId;
        } catch (Exception e) {
            return null;
        }
    }
}
