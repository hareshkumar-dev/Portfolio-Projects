/**
 * Tests for MeetSlotController (the React calendar's data layer).
 */
@isTest
private class MeetSlotControllerTest {

    @isTest
    static void readsByMonth() {
        Date first = Date.today().toStartOfMonth();
        Test.startTest();
        insert new List<Meeting__c>{
            new Meeting__c(Name = 'Sprint planning', Meeting_Date__c = first.addDays(1),  Start_Time__c = Time.newInstance(10, 0, 0, 0),  Duration_Minutes__c = 60, Type__c = 'Internal'),
            new Meeting__c(Name = 'Client kickoff',  Meeting_Date__c = first.addDays(3),  Start_Time__c = Time.newInstance(14, 30, 0, 0), Duration_Minutes__c = 45, Type__c = 'Client Meeting')
        };
        Test.stopTest();

        Date today = Date.today();
        List<Meeting__c> thisMonth = MeetSlotController.getMeetings(today.year(), today.month());
        System.assert(thisMonth.size() >= 2, 'Meetings land in the current month');
    }

    @isTest
    static void monthFilterExcludesOtherMonths() {
        Date first = Date.today().toStartOfMonth();
        insert new List<Meeting__c>{
            new Meeting__c(Name = 'In range',  Meeting_Date__c = first.addDays(5)),
            new Meeting__c(Name = 'Next month', Meeting_Date__c = first.addMonths(1).addDays(5))
        };

        List<Meeting__c> result =
            MeetSlotController.getMeetings(first.year(), first.month());

        System.assertEquals(1, result.size(), 'Only the current month is returned');
        System.assertEquals('In range', result[0].Name);
    }

    @isTest
    static void createsMeetingFromJsonPayload() {
        String payload = JSON.serialize(new Map<String, Object>{
            'subject' => 'Architecture review',
            'date' => String.valueOf(Date.today()),
            'startTime' => '14:30',
            'duration' => 45,
            'type' => 'Internal',
            'attendees' => 'Priya, Arjun',
            'notes' => 'Bring the diagrams'
        });

        Test.startTest();
        Id id = MeetSlotController.createMeeting(payload);
        Test.stopTest();

        Meeting__c m = [
            SELECT Name, Meeting_Date__c, Start_Time__c, Duration_Minutes__c, Type__c
            FROM Meeting__c WHERE Id = :id
        ];
        System.assertEquals('Architecture review', m.Name);
        System.assertEquals(Date.today(), m.Meeting_Date__c);
        System.assertEquals(Time.newInstance(14, 30, 0, 0), m.Start_Time__c);
        System.assertEquals(45, m.Duration_Minutes__c);
        System.assertEquals('Internal', m.Type__c);
    }

    @isTest
    static void createRequiresSubjectAndDate() {
        Test.startTest();
        try {
            MeetSlotController.createMeeting(JSON.serialize(
                new Map<String, Object>{ 'subject' => 'No date' }
            ));
            System.assert(false, 'Should have thrown for a missing date');
        } catch (AuraHandledException e) {
            System.assert(true);
        }
        Test.stopTest();
    }

    @isTest
    static void deletesMeeting() {
        Meeting__c m = new Meeting__c(Name = 'Doomed', Meeting_Date__c = Date.today());
        insert m;

        Test.startTest();
        MeetSlotController.deleteMeeting(m.Id);
        Test.stopTest();

        System.assertEquals(0, [SELECT COUNT() FROM Meeting__c WHERE Id = :m.Id],
            'Meeting should be deleted');
    }
}
