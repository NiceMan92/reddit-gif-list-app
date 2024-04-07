import { Injectable, computed, inject, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Gif, RedditPost, RedditResponse } from "../interfaces";
import { EMPTY, Subject, catchError, concatMap, debounceTime, distinctUntilChanged, expand, map, of, startWith, switchMap } from "rxjs";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { FormControl } from "@angular/forms";

export interface GifState {
  gifs: Gif[];
  error: string | null;
  loading: boolean;
  lastKnownGif: string | null;
}

@Injectable({providedIn:'root'})
export class RedditService {

  http = inject(HttpClient);
  subredditFormControl = new FormControl();

  private error$ = new Subject<string | null>();

  // state
  private state = signal<GifState>({
    gifs: [],
    error: null,
    loading: false,
    lastKnownGif: null
  });

  // selector
  gifs = computed(() => this.state().gifs);
  error = computed(() => this.state().error);
  loading = computed(() => this.state().loading);
  lastKnownGif = computed(() => this.state().lastKnownGif);

  // sources
  pagination$ = new Subject<string | null>();
  private subredditChanged$ = this.subredditFormControl.valueChanges.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    startWith('gifs'),
    map((subreddit) => (subreddit.length ? subreddit : 'gifs' ))
  );
  private gifsLoaded$ = this.subredditChanged$.pipe(
    switchMap((subredit) =>
      this.pagination$.pipe(
        startWith(null),
        concatMap((lastKnownGif) =>
          this.fetchFromReddit(subredit, lastKnownGif, 20).pipe(
            expand((response, index) => {
              const {gifs, lastKnownGif, gifRequired } = response;
              const remainingGifsToFecth = gifs.length - gifRequired;
              const maxAttempts = 15;

              const shouldKeepTrying =
                remainingGifsToFecth > 0 &&
                index < maxAttempts &&
                lastKnownGif !== null;

              return shouldKeepTrying ?
              this.fetchFromReddit(subredit, lastKnownGif, remainingGifsToFecth)
              : EMPTY;
            })
          )
        )
      )
    )
  );

  private fetchFromReddit(subreddit: string, after: string | null, gifRequired: number) {
    return this.http
    .get<RedditResponse>(
      `https://www.reddit.com/r/${subreddit}/hot/.json?limit=${gifRequired}` + (after ? `&after=${after}` : '')
    )
    .pipe(
      catchError((err) => {
        this.handleError(err);
        return EMPTY;
      }),
      map (redditResponse => {
        const posts = redditResponse.data.children;
        const lastKnownGif = posts.length ? posts[posts.length - 1].data.name : null;
        return {
          gifs: this.convertRedditPostsToGifs(redditResponse.data.children),
          lastKnownGif,
          gifRequired,
        }
      }
    ));
  }

  private convertRedditPostsToGifs(posts: RedditPost[]): Gif[] {
    const defaultThumbnails = ['default', 'none', 'nsfw'];
    return posts.
    map((post) => {
      const thumbnail = post.data.thumbnail;
      const modifiedThumbnail = defaultThumbnails.includes(thumbnail)
        ? `/assets/${thumbnail}.png`
        : thumbnail;
        return {
          src: this.getBestSrcForGif(post),
          author: post.data.author,
          name: post.data.name,
          permalink: post.data.permalink,
          title: post.data.title,
          thumbnail: modifiedThumbnail,
          comments: post.data.num_comments
        };
    })
    .filter((post): post is Gif => post.src !== null)
  }

  private getBestSrcForGif(post: RedditPost) {
    // If the source is in .mp4 format, leave unchanged
    if (post.data.url.indexOf('.mp4') > -1) {
      return post.data.url;
    }

    // If the source is in .gifv or .webm formats, convert to .mp4 and return
    if (post.data.url.indexOf('.gifv') > -1) {
      return post.data.url.replace('.gifv', '.mp4');
    }

    if (post.data.url.indexOf('.webm') > -1) {
      return post.data.url.replace('.webm', '.mp4');
    }

    // If the URL is not .gifv or .webm, check if media or secure media is available
    if (post.data.secure_media?.reddit_video) {
      return post.data.secure_media.reddit_video.fallback_url;
    }

    if (post.data.media?.reddit_video) {
      return post.data.media.reddit_video.fallback_url;
    }

    // If media objects are not available, check if a preview is available
    if (post.data.preview?.reddit_video_preview) {
      return post.data.preview.reddit_video_preview.fallback_url;
    }

    // No useable formats available
    return null;
  }

  constructor(){
    // reducers
    this.gifsLoaded$.pipe(takeUntilDestroyed()).subscribe(response => {
      this.state.update(state =>({
        ...state,
        gifs: [...state.gifs, ...response.gifs],
        loading: false,
        lastKnownGif: response.lastKnownGif
          }));
    });

    this.subredditChanged$.pipe(
     takeUntilDestroyed()
    ).subscribe(() => {
      this.state.update((state) => ({
        ...state,
        loading: true,
        lastKnownGif: null,
        gifs:[]
      }))
    });

    this.error$.pipe(takeUntilDestroyed()).subscribe((error) => {
      this.state.update(state => ({
        ...state,
        error
      }))
    });
  }

  private handleError(err: HttpErrorResponse){
    console.log(err);
    // Handle specific error cases
    if(err.status === 404 && err.url) {
      this.error$.next(`Failed to load gifs for /r/${err.url.split(`/`)[4]}`);
      return;
    }

  // generic error if no case match
  this.error$.next(err.statusText);
  }

}
