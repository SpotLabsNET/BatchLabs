import { Component, Input, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { FormControl } from "@angular/forms";
import { MatDialog } from "@angular/material";
import { Router } from "@angular/router";
import { autobind } from "core-decorators";
import { Observable, Subscription } from "rxjs";

import { BackgroundTaskService } from "app/components/base/background-task";
import { ContextMenu, ContextMenuItem } from "app/components/base/context-menu";
import { LoadingStatus } from "app/components/base/loading";
import { QuickListComponent, QuickListItemStatus } from "app/components/base/quick-list";
import { ListOrTableBase } from "app/components/base/selectable-list";
import { TableComponent } from "app/components/base/table";
import { Job, JobState } from "app/models";
import { FailureInfoDecorator } from "app/models/decorators";
import { JobListParams, JobService, PinnedEntityService } from "app/services";
import { ListView } from "app/services/core";
import { Filter } from "app/utils/filter-builder";
import {
    DeleteJobAction,
    DeleteJobDialogComponent,
    DisableJobDialogComponent,
    EnableJobDialogComponent,
    TerminateJobDialogComponent,
} from "../action";

@Component({
    selector: "bl-job-list",
    templateUrl: "job-list.html",
})
export class JobListComponent extends ListOrTableBase implements OnInit, OnDestroy {
    public LoadingStatus = LoadingStatus;

    public status: Observable<LoadingStatus>;
    public data: ListView<Job, JobListParams>;
    public searchQuery = new FormControl();

    @ViewChild(QuickListComponent)
    public list: QuickListComponent;

    @ViewChild(TableComponent)
    public table: TableComponent;

    @Input()
    public quickList: boolean;

    @Input()
    public set filter(filter: Filter) {
        this._filter = filter;

        if (filter.isEmpty()) {
            this.data.setOptions({ ...this._baseOptions });
        } else {
            this.data.setOptions({ ...this._baseOptions, filter: filter.toOData() });
        }

        this.data.fetchNext();
    }
    public get filter(): Filter { return this._filter; }

    private _filter: Filter;

    // todo: ask tim about setting difference select options for list and details.
    private _baseOptions = {};
    private _onJobAddedSub: Subscription;

    constructor(
        router: Router,
        dialog: MatDialog,
        private jobService: JobService,
        private pinnedEntityService: PinnedEntityService,
        private taskManager: BackgroundTaskService) {
        super(dialog);
        this.data = this.jobService.listView();
        this.status = this.data.status;
        this._onJobAddedSub = jobService.onJobAdded.subscribe((jobId) => {
            this.data.loadNewItem(jobService.get(jobId));
        });
    }

    public ngOnInit() {
        this.data.fetchNext();
    }

    public ngOnDestroy() {
        this._onJobAddedSub.unsubscribe();
    }

    @autobind()
    public refresh(): Observable<any> {
        return this.data.refresh();
    }

    public jobStatus(job: Job): QuickListItemStatus {
        if (job.executionInfo && job.executionInfo.failureInfo) {
            return QuickListItemStatus.warning;
        } else {
            switch (job.state) {
                case JobState.completed:
                    return QuickListItemStatus.normal;
                case JobState.disabled:
                case JobState.disabling:
                    return QuickListItemStatus.accent;
                case JobState.active:
                case JobState.enabling:
                    return QuickListItemStatus.lightaccent;
                case JobState.terminating:
                    return QuickListItemStatus.important;
                default:
                    return QuickListItemStatus.normal;
            }
        }
    }

    public jobStatusText(job: Job): string {
        if (job.executionInfo && job.executionInfo.failureInfo) {
            return new FailureInfoDecorator(job.executionInfo.failureInfo).summary;
        } else {
            switch (job.state) {
                case JobState.completed:
                    return "";
                default:
                    return `Job is ${job.state}`;
            }
        }
    }

    public onScrollToBottom(x) {
        this.data.fetchNext();
    }

    public deleteSelected() {
        this.taskManager.startTask("", (backgroundTask) => {
            const task = new DeleteJobAction(this.jobService, this.selectedItems);
            task.start(backgroundTask);
            return task.waitingDone;
        });
    }

    public deleteJob(job: Job) {
        const dialogRef = this.dialog.open(DeleteJobDialogComponent);
        dialogRef.componentInstance.jobId = job.id;
        dialogRef.afterClosed().subscribe((obj) => {
            this.jobService.get(job.id);
        });
    }

    public terminateJob(job: Job) {
        const dialogRef = this.dialog.open(TerminateJobDialogComponent);
        dialogRef.componentInstance.jobId = job.id;
        dialogRef.afterClosed().subscribe((obj) => {
            this.jobService.get(job.id);
        });
    }

    public disableJob(job: Job) {
        const dialogRef = this.dialog.open(DisableJobDialogComponent);
        dialogRef.componentInstance.jobId = job.id;
        dialogRef.afterClosed().subscribe((obj) => {
            this.jobService.get(job.id);
        });
    }

    public enableJob(job: Job) {
        const dialogRef = this.dialog.open(EnableJobDialogComponent);
        dialogRef.componentInstance.jobId = job.id;
        dialogRef.afterClosed().subscribe((obj) => {
            this.jobService.get(job.id);
        });
    }

    public contextmenu(job: Job) {
        const isCompleted = job.state === JobState.completed;
        const isDisabled = job.state === JobState.disabled;
        return new ContextMenu([
            new ContextMenuItem({ label: "Delete", click: () => this.deleteJob(job) }),
            new ContextMenuItem({ label: "Terminate", click: () => this.terminateJob(job), enabled: !isCompleted }),
            new ContextMenuItem({
                label: "Enable",
                click: () => this.enableJob(job),
                enabled: !isCompleted && isDisabled,
            }),
            new ContextMenuItem({
                label: "Disable",
                click: () => this.disableJob(job),
                enabled: !isCompleted && !isDisabled,
            }),
            new ContextMenuItem({
                label: this.pinnedEntityService.isFavorite(job) ? "Unpin favorite" : "Pin to favorites",
                click: () => this._pinJob(job),
            }),
        ]);
    }

    public trackByFn(index: number, job: Job) {
        return job.id;
    }

    private _pinJob(job: Job) {
        this.pinnedEntityService.pinFavorite(job).subscribe((result) => {
            if (result) {
                this.pinnedEntityService.unPinFavorite(job);
            }
        });
    }
}
