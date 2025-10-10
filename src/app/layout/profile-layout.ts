import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <header class="bg-neutral-900 border-b border-neutral-800/80">
  <div class="container py-6">
    <!-- Banner -->
    <div class="banner"></div>

    <!-- Perfil -->
    <div class="flex items-end gap-4 -mt-10 relative z-10">
      <div class="avatar-lg">
        <img src="/assets/avatar.jpg" alt="Avatar" class="w-full h-full object-cover">
      </div>

      <div class="pb-1 min-w-0">
        <h1 class="text-2xl md:text-3xl font-bold leading-tight">
          Andreu Simonet <span class="text-[var(--color-brand)]">★</span>
        </h1>
        <p class="text-neutral-400 text-sm">Web Developer</p>
      </div>

      <a href="/feed.xml" rel="alternate" type="application/rss+xml" class="ml-auto btn-follow">
        <span>Follow</span>
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" class="opacity-90">
          <path fill="currentColor" d="M6 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm-4-8v3a7 7 0 0 1 7 7h3c0-5.523-4.477-10-10-10Zm0-6v3c8.284 0 15 6.716 15 15h3C20 11.85 12.15 4 2 4Z"/>
        </svg>
      </a>
    </div>

    <!-- Tabs scrollable en móvil -->
    <nav class="tabs">
      <a routerLink="/feed"    routerLinkActive="router-link-active">Feed</a>
      <a routerLink="/about"   routerLinkActive="router-link-active">About</a>
      <a routerLink="/content" routerLinkActive="router-link-active">Content</a>
      <a routerLink="/contact" routerLinkActive="router-link-active">Contact</a>
    </nav>
  </div>
</header>

<main class="py-6">
  <div class="container">
    <router-outlet />
  </div>
</main>
  `
})
export class ProfileLayout {}
