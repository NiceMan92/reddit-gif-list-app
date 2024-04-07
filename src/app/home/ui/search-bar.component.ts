import { Component, input } from "@angular/core";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import {MatFormField} from '@angular/material/form-field';
import {MatLabel, MatInput, MatSuffix} from '@angular/material/input';
import {MatIcon} from '@angular/material/icon';
import {MatToolbarModule} from '@angular/material/toolbar';


@Component({
  selector: 'app-search-bar',
  standalone: true,
  template: `
    <mat-toolbar>
      <mat-form-field appearance="outline">
        <input
          matInput
          type="text"
          placeholder="subreddit..."
          [formControl]="subredditFormControl()"
        />
        <mat-icon matSuffix>search</mat-icon>
      </mat-form-field>
    </mat-toolbar>
  `,
  imports: [MatLabel, MatSuffix, MatFormField, MatInput, MatIcon, ReactiveFormsModule, MatToolbarModule],
  styles: `
    mat-toolbar {
      height: 80px;
    }
    mat-form-field {
      width: 100%;
      padding-top: 20px;
    }
  `
})
export class SearchBarComponent {
  subredditFormControl = input.required<FormControl>();
}
