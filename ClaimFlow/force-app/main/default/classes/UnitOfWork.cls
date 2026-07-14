/**
 * UnitOfWork — collects record changes and commits in one ordered
 * transaction (updates before inserts). Centralises DML.
 */
public with sharing class UnitOfWork {

    private final List<SObject> newRecords = new List<SObject>();
    private final List<SObject> dirtyRecords = new List<SObject>();

    public void registerNew(SObject record) { newRecords.add(record); }
    public void registerNew(List<SObject> records) { newRecords.addAll(records); }
    public void registerDirty(SObject record) { dirtyRecords.add(record); }

    public void commitWork() {
        if (!dirtyRecords.isEmpty()) update dirtyRecords;
        if (!newRecords.isEmpty()) insert newRecords;
    }
}
