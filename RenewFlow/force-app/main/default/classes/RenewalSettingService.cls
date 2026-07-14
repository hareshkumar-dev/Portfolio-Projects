/**
 * RenewalSettingService — reads renewal timing from Renewal_Setting__mdt
 * (CONFIG layer). Falls back to safe defaults and is test-injectable.
 */
public with sharing class RenewalSettingService {

    public class Settings {
        public Integer leadTimeDays;
        public Integer graceDays;
        public Integer defaultTerm;
    }

    private static Settings cache;

    @TestVisible
    private static Settings testOverride;

    public static Settings get() {
        if (testOverride != null) return testOverride;
        if (cache != null) return cache;

        Settings s = new Settings();
        List<Renewal_Setting__mdt> rows = [
            SELECT Lead_Time_Days__c, Grace_Period_Days__c, Default_Term_Months__c
            FROM Renewal_Setting__mdt LIMIT 1
        ];
        if (!rows.isEmpty()) {
            s.leadTimeDays = Integer.valueOf(rows[0].Lead_Time_Days__c);
            s.graceDays = Integer.valueOf(rows[0].Grace_Period_Days__c);
            s.defaultTerm = Integer.valueOf(rows[0].Default_Term_Months__c);
        } else {
            s.leadTimeDays = 60;
            s.graceDays = 15;
            s.defaultTerm = 12;
        }
        cache = s;
        return s;
    }

    @TestVisible
    private static void setTestSettings(Settings s) {
        testOverride = s;
    }
}
