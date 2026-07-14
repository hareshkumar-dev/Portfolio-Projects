/**
 * Test utility: installs SLA policies in-memory so tests don't depend
 * on Custom Metadata rows (which can't be inserted in a test).
 */
@IsTest
public class SlaTestData {
    public static void installPolicies() {
        SlaPolicyService.setTestPolicies(new List<SlaPolicyService.Policy>{
            new SlaPolicyService.Policy('Platinum', 15, 4),
            new SlaPolicyService.Policy('Gold', 60, 24),
            new SlaPolicyService.Policy('Standard', 240, 72)
        });
    }
}
