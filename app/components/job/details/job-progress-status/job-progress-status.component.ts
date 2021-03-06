import { Component, Input, OnChanges, OnDestroy } from "@angular/core";
import { List } from "immutable";
import { Subscription } from "rxjs";

import { GaugeConfig } from "app/components/base/graphs/gauge";
import { Job, JobTaskCounts, Node, Pool } from "app/models";
import { JobService, NodeListParams, NodeService, PoolParams, PoolService } from "app/services";
import { EntityView, ListView, PollObservable, PollService } from "app/services/core";

const refreshRate = 5000;
import "./job-progress-status.scss";

@Component({
    selector: "bl-job-progress-status",
    templateUrl: "job-progress-status.html",
})
export class JobProgressStatusComponent implements OnChanges, OnDestroy {
    @Input()
    public job: Job;

    @Input()
    public poolId: string;

    public nodes: List<Node> = List([]);
    public pool: Pool;

    public showAllPoolTasks = false;
    public runningTasksCount = 0;
    public queuedTaskCount: string = "-";
    public succeededTaskCount: string = "-";
    public failedTaskCount: string = "-";
    public maxRunningTasks = 0;
    public gaugeOptions: GaugeConfig;
    public jobTaskCounts: JobTaskCounts = new JobTaskCounts();
    public progress = null;

    private data: ListView<Node, NodeListParams>;
    private poolData: EntityView<Pool, PoolParams>;

    private _polls: PollObservable[] = [];
    private _subs: Subscription[] = [];

    constructor(
        poolService: PoolService,
        nodeService: NodeService,
        private jobService: JobService,
        pollService: PollService,
    ) {
        this.poolData = poolService.view();
        this.data = nodeService.listView({
            pageSize: 1000,
            select: "id,state,runningTasksCount",
        });

        this.updateGaugeOptions();

        this._subs.push(this.poolData.item.subscribe((pool) => {
            this.pool = pool;
            this.maxRunningTasks = pool ? pool.targetNodes * pool.maxTasksPerNode : 1;
            this.updateGaugeOptions();
        }));

        this._subs.push(this.data.items.subscribe((nodes) => {
            if (this.nodes.size !== nodes.size) {
                this.poolData.refresh();
            }
            this.nodes = nodes;
            this.countRunningTasks();
            this.updateGaugeOptions();
        }));

        this._polls.push(this.data.startPoll(refreshRate));

        this._polls.push(pollService.startPoll("count-tasks", 10000, () => this._updateJobRunningTasks()));
    }

    public ngOnChanges(changes) {
        if (changes.poolId) {
            this.poolData.params = ({ id: this.poolId });
            this.poolData.refresh();
            this.data.updateParams({ poolId: this.poolId });
            this.data.refreshAll(false);
        }

        if (changes.job) {
            this._updateJobRunningTasks();
        }
    }

    public ngOnDestroy() {
        this._polls.forEach(x => x.destroy());
        this._subs.forEach(x => x.unsubscribe());
        this.poolData.dispose();
    }

    public countRunningTasks() {
        if (this.showAllPoolTasks) {
            const taskCountPerNode = this.nodes.map(x => x.runningTasksCount);
            this.runningTasksCount = taskCountPerNode.reduce((a, b) => a + b, 0);
            this.queuedTaskCount = "-";
            this.failedTaskCount = "-";
            this.succeededTaskCount = "-";
        } else {
            this.runningTasksCount = this.jobTaskCounts.running;
            this.queuedTaskCount = this.jobTaskCounts.active.toString();
            this.failedTaskCount = this.jobTaskCounts.failed.toString();
            this.succeededTaskCount = this.jobTaskCounts.succeeded.toString();
        }
    }

    public updateGaugeOptions() {
        this.gaugeOptions = {
            min: 0,
            max: this.maxRunningTasks,
            title: "Running tasks",
            labels: {
                max: {
                    tooltip: `This pool allows for a total of ${this.maxRunningTasks} tasks to run simultaneously.`,
                },
            },
        };
    }

    public updateShowAllPoolTasks(value: boolean) {
        this.showAllPoolTasks = value;
        this.countRunningTasks();
        this.updateGaugeOptions();
    }

    private _updateJobRunningTasks() {
        const obs = this.jobService.getTaskCounts(this.job.id);

        obs.subscribe((x) => {
            this.jobTaskCounts = x;
            this.countRunningTasks();
            this._computeProgress();
        });
        return obs;
    }

    private _computeProgress() {
        if (this.jobTaskCounts.total === 0) {
            this.progress = null;
        } else {
            const total = this.jobTaskCounts.total;
            this.progress = {
                completed: (this.jobTaskCounts.completed / total * 100).toFixed(2),
                buffer: ((this.jobTaskCounts.completed + this.jobTaskCounts.running) / total * 100).toFixed(2),
            };
        }
    }

}
