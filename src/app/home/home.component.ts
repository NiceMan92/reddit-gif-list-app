import { Component, inject } from '@angular/core';
import { gifListComponent } from "./ui/gif-list.component";
import { RedditService } from '../shared/data-access/reddit.service';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { SearchBarComponent } from "./ui/search-bar.component";
import { MatProgressSpinner } from '@angular/material/progress-spinner';

@Component({
    selector: 'app-home',
    standalone: true,
    template: `
    <app-search-bar [subredditFormControl]="redditService.subredditFormControl"/>
    @if(redditService.loading()){
      <mat-progress-spinner mode="indeterminate" diameter="50" />
    } @else {
      <app-gif-list
    [gifs]="this.redditService.gifs()"
     class="grid-container"
     infiniteScroll
     (scrolled)="this.redditService.pagination$.next(this.redditService.lastKnownGif())" />
    }
  `,
    styles: `
    mat-progress-spinner {
      margin: 2rem auto
    }
    `,
    imports: [gifListComponent, InfiniteScrollModule, SearchBarComponent, MatProgressSpinner]
})
export default class HomeComponent {
  redditService = inject(RedditService);
}
