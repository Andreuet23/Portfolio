import { Component, Input } from '@angular/core';
import { NgFor, NgIf, NgClass, DatePipe } from '@angular/common';
import { Post } from '../../core/services/post.service';
import { RouterLink } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-post-card',
  imports: [NgIf, NgFor, NgClass, RouterLink, DatePipe],
  template: `
  <article class="card-post">
    <!-- Header -->
    <header class="post-header">
      <div class="post-avatar">
        <img src="/assets/avatar.jpg" alt="Andreu" class="w-full h-full object-cover">
      </div>

      <div class="flex-1 min-w-0">
        <div class="flex items-center flex-wrap gap-x-2">
          <a class="post-name hover:underline" routerLink="/about">Andreu Simonet</a>
          <span class="dot"></span>
          <span class="post-meta">{{ post.createdAt | date:'medium' }}</span>
        </div>

        <!-- Body -->
        <div class="post-body">
          <div class="prose" [innerHTML]="post.contentHtml"></div>

          <!-- Galería adicional -->
          <div *ngIf="post.images?.length" class="post-gallery"
               [ngClass]="{
                 'g-1': post.images?.length === 1,
                 'g-2': post.images?.length === 2,
                 'g-3': (post.images?.length ?? 0) >= 3
               }">
            <img *ngFor="let img of post.images"
                 [src]="img" loading="lazy" decoding="async"
                 [class]="post.images?.length===1 ? 'aspect-[16/9]' : 'aspect-square'">
          </div>

          <!-- Cover opcional enlazada -->
          <a *ngIf="post.cover" class="block mt-3" [routerLink]="['/post', post.slug]">
            <img [src]="post.cover" alt="" class="rounded-xl border border-white/10 w-full max-h-[60vh] object-cover">
          </a>

          <!-- Tags -->
          <div class="post-tags" *ngIf="post.tags?.length">
            <span *ngFor="let t of post.tags" class="post-tag">#{{ t }}</span>
          </div>
        </div>

        <!-- Acciones -->
        <div class="post-actions">
          <button class="post-act" type="button" aria-label="Comentar">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z"/>
            </svg>
            Comentar
          </button>
          <button class="post-act" type="button" aria-label="Repost">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M17 1l4 4-4 4V6H7V4h10V1zM7 23l-4-4 4-4v3h10v2H7v3z"/>
            </svg>
            Repost
          </button>
          <button class="post-act" type="button" aria-label="Like">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M12 21s-6.716-4.686-9.192-7.162A5.5 5.5 0 0 1 10.95 5.696L12 6.757l1.05-1.06a5.5 5.5 0 0 1 7.778 7.778C18.716 16.314 12 21 12 21Z"/>
            </svg>
            Like
          </button>
        </div>
      </div>
    </header>
  </article>
  `
})
export class PostCard {
  @Input({ required: true }) post!: Post;
}