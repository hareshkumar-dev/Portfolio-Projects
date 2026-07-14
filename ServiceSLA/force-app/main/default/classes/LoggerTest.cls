/**
 * Tests the logging framework: buffering and a single flush DML.
 */
@IsTest
private class LoggerTest {

    @IsTest
    static void buffersThenFlushes() {
        Test.startTest();
        Logger.info('LoggerTest', 'an info message');
        Logger.warn('LoggerTest', 'a warning');
        Logger.error('LoggerTest', 'an error');
        System.assertEquals(3, Logger.bufferSize(), 'Logs buffered, not yet committed');
        Logger.flush();
        Test.stopTest();

        System.assertEquals(3, [SELECT COUNT() FROM Log__c], 'Flush persists all buffered logs');
        System.assertEquals(0, Logger.bufferSize(), 'Buffer cleared after flush');
    }

    @IsTest
    static void logsExceptions() {
        Test.startTest();
        try {
            Integer x = 1 / 0;
        } catch (Exception e) {
            Logger.error('LoggerTest.logsExceptions', e);
        }
        Logger.flush();
        Test.stopTest();

        System.assertEquals(1, [SELECT COUNT() FROM Log__c WHERE Level__c = 'Error'],
            'Exception logged as Error');
    }
}
