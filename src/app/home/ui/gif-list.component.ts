import { Component, input } from "@angular/core";
import { Gif } from "../../shared/interfaces";
import { GifPlayerComponent } from "./gif-player.component";

@Component({
  standalone: true,
  selector: 'app-gif-list',
  template: `
    @for (gif of gifs(); track gif.permalink) {
      <div>
      <app-gif-player [src]="gif.src" [thumbnail]="gif.thumbnail"/>
      </div>
    }
  `,
  imports: [GifPlayerComponent]
})
export class gifListComponent {
  gifs = input.required<Gif[]>() ;
}
