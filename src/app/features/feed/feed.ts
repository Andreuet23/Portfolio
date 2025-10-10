import { Component, OnInit, inject } from '@angular/core';
import { NgFor } from '@angular/common';
import { PostsService, Post } from '../../core/services/post.service';
import { PostCard } from './post-card';

@Component({
  standalone: true,
  selector: 'app-feed-page',
  imports: [NgFor, PostCard],
  template: `
  <!-- src/app/pages/feed/feed-page.component.html -->
<section class="space-y-3">
  @if (postsSvc.error()) {
    <div class="card p-4 text-red-300">
      {{ postsSvc.error() }}
    </div>
  }

  @if (postsSvc.loading()) {
    <div class="card-post p-6 animate-pulse">Cargando…</div>
    <div class="card-post p-6 animate-pulse">Cargando…</div>
  } @else {
    <ng-container *ngFor="let post of postsSvc.posts(); trackBy: trackById">
      <app-post-card [post]="post" />
    </ng-container>

    @if (!postsSvc.posts()?.length && !postsSvc.error()) {
      <div class="card p-4 text-neutral-400">Sin posts por ahora.</div>
    }
  }
</section>
  `
})
export class Feed implements OnInit {
  postsSvc = inject(PostsService);
  ngOnInit() { this.postsSvc.refresh(); }
  trackById(_: number, p: Post) { return p?.id || p?.slug; }
}