/**
 * TriggerHandler — minimal trigger-handler framework (base class).
 * Includes an afterDelete hook, needed here so roll-ups recalculate
 * when a subscription is removed.
 */
public virtual class TriggerHandler {

    public void run() {
        if (Trigger.isBefore && Trigger.isInsert) {
            beforeInsert(Trigger.new);
        } else if (Trigger.isBefore && Trigger.isUpdate) {
            beforeUpdate(Trigger.new, (Map<Id, SObject>) Trigger.oldMap);
        } else if (Trigger.isAfter && Trigger.isInsert) {
            afterInsert(Trigger.new, (Map<Id, SObject>) Trigger.newMap);
        } else if (Trigger.isAfter && Trigger.isUpdate) {
            afterUpdate(Trigger.new, (Map<Id, SObject>) Trigger.oldMap);
        } else if (Trigger.isAfter && Trigger.isDelete) {
            afterDelete(Trigger.old, (Map<Id, SObject>) Trigger.oldMap);
        }
    }

    protected virtual void beforeInsert(List<SObject> newList) {}
    protected virtual void beforeUpdate(List<SObject> newList, Map<Id, SObject> oldMap) {}
    protected virtual void afterInsert(List<SObject> newList, Map<Id, SObject> newMap) {}
    protected virtual void afterUpdate(List<SObject> newList, Map<Id, SObject> oldMap) {}
    protected virtual void afterDelete(List<SObject> oldList, Map<Id, SObject> oldMap) {}
}
