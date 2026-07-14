/**
 * ProjectBoardController
 *
 * Data layer for the React Kanban board. The React app never calls
 * Apex directly — the projectBoard LWC exposes these methods to React
 * through a small bridge object, so this is a normal @AuraEnabled
 * controller.
 */
public with sharing class ProjectBoardController {

    private static final Set<String> STAGES =
        new Set<String>{ 'To Do', 'In Progress', 'Review', 'Done' };

    @AuraEnabled
    public static List<Project_Task__c> getTasks() {
        return [
            SELECT Id, Name, Stage__c, Assignee__c, Priority__c, Due_Date__c, Description__c
            FROM Project_Task__c
            ORDER BY CreatedDate ASC
            LIMIT 500
        ];
    }

    /**
     * Create a task from a JSON payload sent by the React form
     * ({ title, assignee, priority, dueDate, description }).
     */
    @AuraEnabled
    public static Id createTask(String payload) {
        Map<String, Object> data =
            (Map<String, Object>) JSON.deserializeUntyped(payload);

        String title = (String) data.get('title');
        if (String.isBlank(title)) {
            throw new AuraHandledException('Title is required.');
        }

        Project_Task__c task = new Project_Task__c(
            Name = title,
            Assignee__c = (String) data.get('assignee'),
            Priority__c = defaultTo((String) data.get('priority'), 'Medium'),
            Description__c = (String) data.get('description'),
            Stage__c = 'To Do'
        );

        String due = (String) data.get('dueDate');
        if (String.isNotBlank(due)) {
            task.Due_Date__c = Date.valueOf(due);
        }

        insert task;
        return task.Id;
    }

    /** Move a task to a new stage (the drag-and-drop drop handler). */
    @AuraEnabled
    public static void updateStage(Id taskId, String stage) {
        if (!STAGES.contains(stage)) {
            throw new AuraHandledException('Invalid stage: ' + stage);
        }
        update new Project_Task__c(Id = taskId, Stage__c = stage);
    }

    @AuraEnabled
    public static void deleteTask(Id taskId) {
        delete [SELECT Id FROM Project_Task__c WHERE Id = :taskId];
    }

    private static String defaultTo(String value, String fallback) {
        return String.isBlank(value) ? fallback : value;
    }
}
