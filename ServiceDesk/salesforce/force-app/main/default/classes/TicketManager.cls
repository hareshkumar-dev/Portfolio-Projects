/**
 * TicketManager
 *
 * Custom Apex REST service exposing ticket operations at
 * /services/apexrest/tickets. Complements the standard REST API by
 * enforcing business rules on-platform, so they apply regardless of
 * which client creates the record.
 */
@RestResource(urlMapping='/tickets/*')
global with sharing class TicketManager {

    /** GET /services/apexrest/tickets — 50 most recent tickets */
    @HttpGet
    global static List<Case> getTickets() {
        return [
            SELECT Id, CaseNumber, Subject, Description, Status, Priority, CreatedDate
            FROM Case
            ORDER BY CreatedDate DESC
            LIMIT 50
        ];
    }

    /** POST /services/apexrest/tickets — create a ticket */
    @HttpPost
    global static String createTicket(String subject, String description, String priority) {

        // Escalation rule: tickets reporting urgent issues are always High priority.
        if (String.isNotBlank(description) && description.toLowerCase().contains('urgent')) {
            priority = 'High';
        }

        Case ticket = new Case(
            Subject     = subject,
            Description = description,
            Priority    = (priority == null ? 'Medium' : priority),
            Status      = 'New',
            Origin      = 'Web'
        );
        insert ticket;

        return ticket.Id;
    }
}
