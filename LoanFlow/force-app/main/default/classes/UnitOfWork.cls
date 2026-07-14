/**
 * UnitOfWork — collects record changes and commits them in a single,
 * ordered transaction (parents before children). A lightweight take on
 * the enterprise Unit of Work pattern: callers register work, then one
 * commitWork() flushes it, so DML is centralised and bulk-safe.
 */
public with sharing class UnitOfWork {

    private final List<SObject> newRecords = new List<SObject>();
    private final List<SObject> dirtyRecords = new List<SObject>();

    public void registerNew(SObject record) {
        newRecords.add(record);
    }

    public void registerNew(List<SObject> records) {
        newRecords.addAll(records);
    }

    public void registerDirty(SObject record) {
        dirtyRecords.add(record);
    }

    /** Commit dirty updates first, then inserts. */
    public void commitWork() {
        if (!dirtyRecords.isEmpty()) update dirtyRecords;
        if (!newRecords.isEmpty()) insert newRecords;
    }
}
