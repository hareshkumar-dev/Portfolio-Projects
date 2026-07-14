/**
 * The one and only trigger on Case. It contains no logic — it hands off
 * to CaseTriggerHandler through the framework.
 */
trigger CaseTrigger on Case (before insert, before update, after insert, after update) {
    new CaseTriggerHandler().run();
}
