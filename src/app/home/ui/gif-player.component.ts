import { NgStyle } from "@angular/common";
import { Component, ElementRef, computed, effect, input, signal, viewChild } from "@angular/core";
import { takeUntilDestroyed, toObservable } from "@angular/core/rxjs-interop";
import { MatProgressSpinner } from "@angular/material/progress-spinner"
import { EMPTY, Subject, combineLatest, fromEvent, map, switchMap } from "rxjs";

const STATUS = {
  initial : 'initial' ,
  loading : 'loading',
  loaded : 'loaded'
} as const

type ObjectValues<T> = T[keyof T];

type Status =  ObjectValues<typeof STATUS>;

interface GifPlayerState {
  playing: boolean;
  status: Status;
}

@Component({
  standalone: true,
  selector: "app-gif-player",
  template: `
    @if(status() ===  loading){
      <mat-progress-spinner mode="indeterminate" diameter="50"/>
    }
    <div
      [style.background]="'url(' + thumbnail() + ') 50% 50% / cover no-repeat'"
      [ngStyle]="
        status() !== loaded &&
        !['/asset/nsfw.png','/asset/default.png'].includes(thumbnail())
        ? {
          filter: 'blur(10px) brightness(0.6)',
          transform: 'scale(1.1)'
        }
        : {}
      "
      class="preload-background"
    >
      <video
        (click)="togglePlay$.next()"
        #figPlayer
        playsInline
        preload="none"
        [loop]="true"
        [muted]="true"
        [src]="src()"
      ></video>
    </div>
  `,
  imports: [MatProgressSpinner,NgStyle],
  styles: `

    :host {
      display: block;
      position: relative;
      overflow: hidden;
      max-height: 80vh;
    }

    .preload-background {
      width: 100%;
      height: auto;
    }

    video {
      width: 100%;
      max-height: 80vh;
      height: auto;
      margin: auto;
      background: transparent;
    }

    mat-progress-spinner {
      position: absolute;
      top: 2em;
      right: 2em;
      z-index: 1
    }
  `
})
export class GifPlayerComponent {

  src = input.required<string>();
  thumbnail = input.required<string>();

  videoElement = viewChild.required<ElementRef<HTMLVideoElement>>('figPlayer');
  videoElement$ = toObservable(this.videoElement).pipe(
    map(eltRef => eltRef.nativeElement )
  );

  state = signal<GifPlayerState>({
    playing: false,
    status:  STATUS.initial
  });

  // selectors
  playing = computed(() => this.state().playing);
  status = computed(() => this.state().status);

  // sources
  togglePlay$ = new Subject<void>();
  loading = STATUS.loading;
  loaded = STATUS.loaded;

  videoLoadStart$ = combineLatest([
    this.videoElement$,
    toObservable(this.playing)
  ]).pipe(
    switchMap(([element, playing]) => playing ? fromEvent(element, 'loadstart') : EMPTY)
  )

  videoLoadComplete$ = this.videoElement$.pipe(
    switchMap(element => fromEvent(element, 'loadeddata'))
  );

  constructor() {
    // reducers
    this.videoLoadStart$.pipe(
      takeUntilDestroyed()
    ).subscribe( () => {
      this.state.update(state => ({...state, status: STATUS.loading}))
    });

    this.videoLoadComplete$.pipe(
      takeUntilDestroyed()
    ).subscribe( () => {
      this.state.update(state => ({...state, status: STATUS.loaded}))
    });

    this.togglePlay$
    .pipe(takeUntilDestroyed())
    .subscribe( () => {
      this.state.update(state => ({...state, playing: !state.playing}))
    });

    // effects
    effect(() => {
      const video = this.videoElement().nativeElement;
      const playing = this.playing();
      const status =  this.status();

      if(!video)
      return;

      if(playing && status === STATUS.initial){
        video.load();
      }

      if(status === STATUS.loaded){
        playing ? video.play() : video.pause();
      }
    })
  }

}


