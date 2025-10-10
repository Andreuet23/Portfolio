// src/app/features/feed/feed.component.ts
import { Component, inject, computed } from '@angular/core';
import { NgFor, NgIf, DatePipe, NgClass } from '@angular/common';
import { PostsService, Post } from '../../core/services/post.service'; // ajusta la ruta real
import { SafeHtmlPipe } from '../../shared/pipes/safe-html.pipe';

@Component({
  standalone: true,
  selector: 'app-feed',
  imports: [NgFor, NgIf, DatePipe, NgClass, SafeHtmlPipe],
  styles: [`
    @reference "../../../styles.css";
    .card   { @apply border-b border-neutral-800 p-4; }
    .title  { @apply text-lg font-semibold leading-tight; }
    .meta   { @apply text-sm text-neutral-400; }
    .images { @apply mt-4 grid gap-2; }
    .images.cols-1 { grid-template-columns: 1fr; }
    .images.cols-2 { grid-template-columns: 1fr 1fr; }
    .images.cols-3, .images.cols-4 { grid-template-columns: 1fr 1fr; }
    .imgwrap { @apply relative overflow-hidden rounded-xl bg-neutral-900; aspect-ratio: 16/9; }
    .imgwrap img { @apply absolute inset-0 h-full w-full object-cover; }
    .tags { @apply mt-3 flex flex-wrap gap-2; }
    .tag  { @apply rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-300; }
  `],
  template: `
  <section>
    <article *ngFor="let p of posts(); trackBy: trackBySlug" class="card">

      <header class="mb-2">
        <h3 class="title">{{ p.title }}</h3>
        <div class="meta">
          {{ p.createdAt | date:'mediumDate' }}
          <ng-container *ngIf="p.updatedAt"> · actualizado {{ p.updatedAt | date:'mediumDate' }}</ng-container>
        </div>
      </header>

      <!-- CONTENIDO COMPLETO -->
      <div class="body" [innerHTML]="p.contentHtml | safeHtml"></div>

      <!-- GALERÍA DE IMÁGENES (opcional) -->
      <ng-container *ngIf="p.images?.length">
        <div class="images" [ngClass]="colsClass(p.images!.length)">
          <ng-container *ngFor="let src of p.images; index as i">
            <a class="imgwrap" [href]="src" target="_blank" rel="noopener">
              <img [src]="src" [alt]="p.title + ' — imagen ' + (i+1)" loading="lazy" />
            </a>
          </ng-container>
        </div>
      </ng-container>

      <!-- tags (opcional) -->
      <div *ngIf="p.tags?.length" class="tags">
        <span *ngFor="let t of p.tags" class="tag">#{{ t }}</span>
      </div>
    </article>
  </section>
  `
})
export class Feed {
  private svc = inject(PostsService);

  // Usa directamente el signal/computed del servicio:
  posts = computed<Post[]>(() => this.svc.posts());

  trackBySlug = (_: number, p: Post) => p.slug;

  colsClass(n: number) {
    if (n <= 1) return 'cols-1';
    if (n === 2) return 'cols-2';
    return 'cols-4'; // 3–4 → 2 columnas
  }
}