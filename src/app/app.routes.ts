import { Routes } from '@angular/router';
import { Feed } from './features/feed/feed';
import { About } from './features/about/about';
import { Content } from './features/content/content';
import { Contact } from './features/contact/contact';
import { AdminPage } from './pages/admin/admin-page';

export const routes: Routes = [
  { path: '', redirectTo: 'feed', pathMatch: 'full' },
  { path: 'feed', component: Feed },
  { path: 'about', component: About },
  { path: 'content', component: Content },
  { path: 'contact', component: Contact },
  { path: 'admin', component: AdminPage },
  { path: '**', redirectTo: 'feed' },
];
