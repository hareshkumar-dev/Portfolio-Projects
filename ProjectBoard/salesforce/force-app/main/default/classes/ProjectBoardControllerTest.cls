/**
 * Tests for ProjectBoardController (the React board's data layer).
 */
@isTest
private class ProjectBoardControllerTest {

    @isTest
    static void readsTasks() {
        Test.startTest();
        insert new List<Project_Task__c>{
            new Project_Task__c(Name = 'Design landing page', Stage__c = 'To Do',       Priority__c = 'High'),
            new Project_Task__c(Name = 'Build auth module',   Stage__c = 'In Progress', Priority__c = 'High'),
            new Project_Task__c(Name = 'Provision staging',   Stage__c = 'Done',        Priority__c = 'Low')
        };
        Test.stopTest();

        System.assertEquals(3, ProjectBoardController.getTasks().size(), 'All tasks returned');
    }

    @isTest
    static void createsTaskFromJsonPayload() {
        String payload = JSON.serialize(new Map<String, Object>{
            'title' => 'Ship release',
            'assignee' => 'Sara',
            'priority' => 'High',
            'dueDate' => String.valueOf(Date.today()),
            'description' => 'Cut the 1.0 release'
        });

        Test.startTest();
        Id id = ProjectBoardController.createTask(payload);
        Test.stopTest();

        Project_Task__c task = [
            SELECT Name, Assignee__c, Priority__c, Stage__c, Due_Date__c
            FROM Project_Task__c WHERE Id = :id
        ];
        System.assertEquals('Ship release', task.Name);
        System.assertEquals('High', task.Priority__c);
        System.assertEquals('To Do', task.Stage__c, 'New tasks start in To Do');
        System.assertEquals(Date.today(), task.Due_Date__c);
    }

    @isTest
    static void createTaskRequiresTitle() {
        String payload = JSON.serialize(new Map<String, Object>{ 'assignee' => 'Nobody' });
        Test.startTest();
        try {
            ProjectBoardController.createTask(payload);
            System.assert(false, 'Should have thrown for a missing title');
        } catch (AuraHandledException e) {
            System.assert(true);
        }
        Test.stopTest();
    }

    @isTest
    static void updatesStageAndDeletes() {
        Project_Task__c task = new Project_Task__c(Name = 'Move me', Stage__c = 'To Do');
        insert task;

        Test.startTest();
        ProjectBoardController.updateStage(task.Id, 'Done');
        Test.stopTest();

        System.assertEquals('Done',
            [SELECT Stage__c FROM Project_Task__c WHERE Id = :task.Id].Stage__c,
            'Stage should update');

        ProjectBoardController.deleteTask(task.Id);
        System.assertEquals(0, [SELECT COUNT() FROM Project_Task__c WHERE Id = :task.Id],
            'Task should be deleted');
    }

    @isTest
    static void rejectsInvalidStage() {
        Project_Task__c task = new Project_Task__c(Name = 'Guarded', Stage__c = 'To Do');
        insert task;
        Test.startTest();
        try {
            ProjectBoardController.updateStage(task.Id, 'Nonsense');
            System.assert(false, 'Should reject an unknown stage');
        } catch (AuraHandledException e) {
            System.assert(true);
        }
        Test.stopTest();
    }
}
