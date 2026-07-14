/**
 * MeetSlotController
 *
 * Data layer for the React team calendar. The React app never calls
 * Apex directly — the meetSlot LWC exposes these methods to React
 * through a small bridge object.
 */
public with sharing class MeetSlotController {

    /** Meetings for one month (month is 1-12), ordered by date/time. */
    @AuraEnabled
    public static List<Meeting__c> getMeetings(Integer year, Integer month) {
        Date rangeStart = Date.newInstance(year, month, 1);
        Date rangeEnd = rangeStart.addMonths(1);
        return [
            SELECT Id, Name, Meeting_Date__c, Start_Time__c, Duration_Minutes__c,
                   Type__c, Attendees__c, Notes__c
            FROM Meeting__c
            WHERE Meeting_Date__c >= :rangeStart AND Meeting_Date__c < :rangeEnd
            ORDER BY Meeting_Date__c ASC, Start_Time__c ASC
            LIMIT 1000
        ];
    }

    /**
     * Book a meeting from a JSON payload sent by the React form
     * ({ subject, date 'YYYY-MM-DD', startTime 'HH:mm', duration, type,
     *    attendees, notes }).
     */
    @AuraEnabled
    public static Id createMeeting(String payload) {
        Map<String, Object> data =
            (Map<String, Object>) JSON.deserializeUntyped(payload);

        String subject = (String) data.get('subject');
        String dateStr = (String) data.get('date');
        if (String.isBlank(subject) || String.isBlank(dateStr)) {
            throw new AuraHandledException('Subject and date are required.');
        }

        Meeting__c meeting = new Meeting__c(
            Name = subject,
            Meeting_Date__c = Date.valueOf(dateStr),
            Start_Time__c = parseTime((String) data.get('startTime')),
            Type__c = defaultTo((String) data.get('type'), 'Client Meeting'),
            Attendees__c = (String) data.get('attendees'),
            Notes__c = (String) data.get('notes')
        );

        Object duration = data.get('duration');
        if (duration != null) {
            meeting.Duration_Minutes__c = Integer.valueOf(String.valueOf(duration));
        }

        insert meeting;
        return meeting.Id;
    }

    @AuraEnabled
    public static void deleteMeeting(Id meetingId) {
        delete [SELECT Id FROM Meeting__c WHERE Id = :meetingId];
    }

    /** "HH:mm" -> Time (null-safe). */
    private static Time parseTime(String value) {
        if (String.isBlank(value)) return null;
        List<String> parts = value.split(':');
        return Time.newInstance(
            Integer.valueOf(parts[0]),
            parts.size() > 1 ? Integer.valueOf(parts[1]) : 0,
            0, 0
        );
    }

    private static String defaultTo(String value, String fallback) {
        return String.isBlank(value) ? fallback : value;
    }
}
