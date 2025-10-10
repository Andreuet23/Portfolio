import { Component } from '@angular/core';

@Component({
  selector: 'app-content',
  imports: [],
  template: `
    <section class="space-y-4">
      <div class="border border-neutral-800 rounded-xl p-4">
        <h3 class="font-semibold">Proyectos</h3>
        <ul class="list-disc ml-6 text-neutral-300">
          <li><a class="text-[var(--color-brand)]" href="#">Proyect 1</a></li>
          <li><a class="text-[var(--color-brand)]" href="#">Proyect 2</a></li>
        </ul>
      </div>
    </section>
  `
})
export class Content {}
