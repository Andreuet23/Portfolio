import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <header class="bg-neutral-900">
      <div class="max-w-3xl mx-auto px-4 pt-16 pb-6">
        <div class="relative h-28 rounded-xl mb-10 overflow-hidden bg-gradient-to-r from-fuchsia-500/20 to-sky-500/20 z-0"></div>
        <div class="flex items-center gap-4 -mt-16">
          <img src="/assets/avatar.jpg" class="w-24 h-24 rounded-full border-4 border-neutral-950 object-cover z-10" alt="Avatar">
          <div>
            <h1 class="text-3xl font-bold">Andreu Simonet <span class="text-[var(--color-brand)]">★</span></h1>
            <p class="text-neutral-400">Web Developer</p>
          </div>
          <a href="/feed.xml" rel="alternate" type="application/rss+xml" class="p-20 ml-auto bg-[var(--color-brand)] hover:opacity-90 text-white px-4 py-2 rounded-lg"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm-4-8v3a7 7 0 0 1 7 7h3c0-5.523-4.477-10-10-10Zm0-6v3c8.284 0 15 6.716 15 15h3C20 11.85 12.15 4 2 4Z"/></svg><span>Follow</span></a>
        </div>
        <nav class="mt-6 flex gap-6 border-b border-neutral-800 text-neutral-300">
          <a routerLink="/feed" routerLinkActive="text-white border-b-2 border-[var(--color-brand)]" class="pb-3 border-b-2 border-transparent">Feed</a>
          <a routerLink="/about" routerLinkActive="text-white border-b-2 border-[var(--color-brand)]" class="pb-3 border-b-2 border-transparent">About</a>
          <a routerLink="/content" routerLinkActive="text-white border-b-2 border-[var(--color-brand)]" class="pb-3 border-b-2 border-transparent">Content</a>
          <a routerLink="/contact" routerLinkActive="text-white border-b-2 border-[var(--color-brand)]" class="pb-3 border-b-2 border-transparent">Contact</a>
        </nav>
      </div>
    </header>

    <main class="max-w-3xl mx-auto px-4 py-6">
      <router-outlet />
    </main>
  `
})
export class ProfileLayout {}
