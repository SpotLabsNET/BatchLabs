import { CloudServiceOsFamily, Pool, SpecCost } from "app/models";
import { PoolUtils } from "app/utils";

describe("PoolUtils", () => {
    describe("#getOsName()", () => {
        it("check os friendly name mappings", () => {
            const cs2Pool = new Pool({
                cloudServiceConfiguration: {
                    currentOSVersion: "*",
                    osFamily: CloudServiceOsFamily.windowsServer2008R2,
                },
            });

            const cs3Pool = new Pool({
                cloudServiceConfiguration: {
                    currentOSVersion: "*",
                    osFamily: CloudServiceOsFamily.windowsServer2012,
                },
            });

            const cs4Pool = new Pool({
                cloudServiceConfiguration: {
                    currentOSVersion: "*",
                    osFamily: CloudServiceOsFamily.windowsServer2012R2,
                },
            });

            const cs5Pool = new Pool({
                cloudServiceConfiguration: {
                    currentOSVersion: "*",
                    osFamily: CloudServiceOsFamily.windowsServer2016,
                },
            });

            const vm1Pool = new Pool({
                virtualMachineConfiguration: {
                    imageReference: {
                        publisher: "Canonical",
                        offer: "UbuntuServer",
                        sku: "16.04-LTS",
                        version: "latest",
                    },
                    nodeAgentSKUId: "batch.node.ubuntu 16.04",
                },
            });

            const vm2Pool = new Pool({
                virtualMachineConfiguration: {
                    imageReference: {
                        publisher: "MicrosoftWindowsServer",
                        offer: "WindowsServer",
                        sku: "2012-R2-Datacenter",
                        version: "latest",
                    },
                    nodeAgentSKUId: "batch.node.windows amd64",
                },
            });

            expect(PoolUtils.getOsName(cs2Pool)).toBe("Windows Server 2008 R2 SP1");
            expect(PoolUtils.getOsName(cs3Pool)).toBe("Windows Server 2012");
            expect(PoolUtils.getOsName(cs4Pool)).toBe("Windows Server 2012 R2");
            expect(PoolUtils.getOsName(cs5Pool)).toBe("Windows Server 2016");
            expect(PoolUtils.getOsName(vm1Pool)).toBe("UbuntuServer 16.04-LTS");
            expect(PoolUtils.getOsName(vm2Pool)).toBe("Windows Server 2012-R2-Datacenter");
        });
    });

    describe("#getComputePoolOsIcon()", () => {
        it("check icon selection based on pool name", () => {
            const cs2Pool = new Pool({
                cloudServiceConfiguration: {
                    currentOSVersion: "*",
                    osFamily: CloudServiceOsFamily.windowsServer2008R2,
                },
            });

            const cs3Pool = new Pool({
                cloudServiceConfiguration: {
                    currentOSVersion: "*",
                    osFamily: CloudServiceOsFamily.windowsServer2012,
                },
            });

            const cs4Pool = new Pool({
                cloudServiceConfiguration: {
                    currentOSVersion: "*",
                    osFamily: CloudServiceOsFamily.windowsServer2012R2,
                },
            });

            const cs5Pool = new Pool({
                cloudServiceConfiguration: {
                    currentOSVersion: "*",
                    osFamily: CloudServiceOsFamily.windowsServer2016,
                },
            });

            const vm1Pool = new Pool({
                virtualMachineConfiguration: {
                    imageReference: {
                        publisher: "Canonical",
                        offer: "UbuntuServer",
                        sku: "16.04-LTS",
                        version: "latest",
                    },
                    nodeAgentSKUId: "batch.node.ubuntu 16.04",
                },
            });

            const vm2Pool = new Pool({
                virtualMachineConfiguration: {
                    imageReference: {
                        publisher: "MicrosoftWindowsServer",
                        offer: "WindowsServer",
                        sku: "2012-R2-Datacenter",
                        version: "latest",
                    },
                    nodeAgentSKUId: "batch.node.windows amd64",
                },
            });

            const vm3Pool = new Pool({
                virtualMachineConfiguration: {
                    imageReference: {
                        publisher: "batch",
                        offer: "rendering-windows2016",
                        sku: "rendering",
                        version: "latest",
                    },
                    nodeAgentSKUId: "batch.node.windows amd64",
                },
            });

            const vm4Pool = new Pool({
                virtualMachineConfiguration: {
                    imageReference: {
                        publisher: "batch",
                        offer: "autodesk-maya-arnold-centos73",
                        sku: "maya-arnold-2017",
                        version: "latest",
                    },
                    nodeAgentSKUId: "batch.node.centos 7",
                },
            });

            expect(PoolUtils.getComputePoolOsIcon(PoolUtils.getOsName(cs2Pool))).toBe("windows");
            expect(PoolUtils.getComputePoolOsIcon(PoolUtils.getOsName(cs3Pool))).toBe("windows");
            expect(PoolUtils.getComputePoolOsIcon(PoolUtils.getOsName(cs4Pool))).toBe("windows");
            expect(PoolUtils.getComputePoolOsIcon(PoolUtils.getOsName(cs5Pool))).toBe("windows");
            expect(PoolUtils.getComputePoolOsIcon(PoolUtils.getOsName(vm1Pool))).toBe("linux");
            expect(PoolUtils.getComputePoolOsIcon(PoolUtils.getOsName(vm2Pool))).toBe("windows");
            expect(PoolUtils.getComputePoolOsIcon(PoolUtils.getOsName(vm3Pool))).toBe("windows");
            expect(PoolUtils.getComputePoolOsIcon(PoolUtils.getOsName(vm4Pool))).toBe("linux");
        });
    });

    it("#poolNodesStatus()", () => {
        const status1 = PoolUtils.poolNodesStatus(new Pool({ allocationState: "resizing" }), 1, 4);
        expect(status1).toEqual("1 → 4");

        const status2 = PoolUtils.poolNodesStatus(new Pool({ allocationState: "steady" }), 4, 0);
        expect(status2).toEqual("4");

        const status3 = PoolUtils.poolNodesStatus(new Pool({ allocationState: "steady", resizeErrors: [{}] }), 1, 10);
        expect(status3).toEqual("1 → 10");
    });

    describe("#computePoolPrice()", () => {
        const cost = new SpecCost({
            id: "standard_a1",
            amount: 12,
            currencyCode: "USD",
            statusCode: 0,
        });

        it("works for a windows pool", () => {
            const windowsConfig = {
                imageReference: { publisher: "Microsoft", offer: "windows", sku: "2016", version: "*" },
                nodeAgentSKUId: "agent.windows",
            };

            const pool = new Pool({
                virtualMachineConfiguration: windowsConfig,
                currentDedicatedNodes: 2,
                currentLowPriorityNodes: 10,
            });
            const poolCost = PoolUtils.computePoolPrice(pool, cost);
            expect(poolCost).toEqual({
                dedicated: 24,
                lowPri: 120 * 0.4, // AT a 60% discount
                total: 24 + 120 * 0.4,
                unit: "USD",
            });
        });

        it("works for a linux pool", () => {
            const windowsConfig = {
                imageReference: { publisher: "Openlogic", offer: "Centos", sku: "7.2", version: "*" },
                nodeAgentSKUId: "agent.centos",
            };

            const pool = new Pool({
                virtualMachineConfiguration: windowsConfig,
                currentDedicatedNodes: 2,
                currentLowPriorityNodes: 10,
            });
            const poolCost = PoolUtils.computePoolPrice(pool, cost);
            expect(poolCost).toEqual({
                dedicated: 24,
                lowPri: 120 * 0.2, // AT a 60% discount
                total: 24 + 120 * 0.2,
                unit: "USD",
            });
        });

    });
});
