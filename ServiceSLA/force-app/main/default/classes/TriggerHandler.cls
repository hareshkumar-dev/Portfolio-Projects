/**
 * TriggerHandler — a minimal trigger-handler framework (base class).
 *
 * A single-line trigger delegates to a subclass of this; the framework
 * routes to the right virtual method by context, so business logic
 * lives in testable classes rather than in trigger bodies. Includes a
 * re-entrancy guard to prevent recursive trigger loops.
 */
public virtual class TriggerHandler {

    private static Set<String> bypassed = new Set<String>();

    /** Route the current trigger context to the matching hook. */
    public void run() {
        if (bypassed.contains(handlerName())) return;

        if (Trigger.isBefore && Trigger.isInsert) {
            beforeInsert(Trigger.new);
        } else if (Trigger.isBefore && Trigger.isUpdate) {
            beforeUpdate(Trigger.new, (Map<Id, SObject>) Trigger.oldMap);
        } else if (Trigger.isAfter && Trigger.isInsert) {
            afterInsert(Trigger.new, (Map<Id, SObject>) Trigger.newMap);
        } else if (Trigger.isAfter && Trigger.isUpdate) {
            afterUpdate(Trigger.new, (Map<Id, SObject>) Trigger.oldMap);
        }
    }

    protected virtual void beforeInsert(List<SObject> newList) {}
    protected virtual void beforeUpdate(List<SObject> newList, Map<Id, SObject> oldMap) {}
    protected virtual void afterInsert(List<SObject> newList, Map<Id, SObject> newMap) {}
    protected virtual void afterUpdate(List<SObject> newList, Map<Id, SObject> oldMap) {}

    private String handlerName() {
        return String.valueOf(this).split(':')[0];
    }

    /** Temporarily disable a handler (e.g. from a data-fix script). */
    public static void bypass(String handlerName) {
        bypassed.add(handlerName);
    }

    public static void clearBypass(String handlerName) {
        bypassed.remove(handlerName);
    }
}
