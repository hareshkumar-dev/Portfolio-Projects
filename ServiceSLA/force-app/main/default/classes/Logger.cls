/**
 * Logger — lightweight observability service.
 *
 * Buffers Log__c records and commits them in one DML at the end of a
 * unit of work, so logging never adds a DML per call. Failures to log
 * are swallowed (logging must never break business logic).
 */
public with sharing class Logger {

    private static final List<Log__c> BUFFER = new List<Log__c>();

    public static void info(String context, String message) {
        add('Info', context, message);
    }

    public static void warn(String context, String message) {
        add('Warning', context, message);
    }

    public static void error(String context, String message) {
        add('Error', context, message);
    }

    public static void error(String context, Exception ex) {
        add('Error', context, ex.getMessage() + '\n' + ex.getStackTraceString());
    }

    private static void add(String level, String context, String message) {
        BUFFER.add(new Log__c(
            Level__c = level,
            Context__c = context == null ? null : context.left(255),
            Message__c = message == null ? null : message.left(32768)
        ));
    }

    /** Persist buffered logs. Call once at the end of the transaction. */
    public static void flush() {
        if (BUFFER.isEmpty()) return;
        try {
            insert BUFFER;
        } catch (Exception e) {
            System.debug(LoggingLevel.ERROR, 'Logger.flush failed: ' + e.getMessage());
        } finally {
            BUFFER.clear();
        }
    }

    @TestVisible
    private static Integer bufferSize() {
        return BUFFER.size();
    }
}
