import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

export type PrimarySection = 'Evolve' | 'Squad' | 'Battle' | 'Explore' | 'Archive';

@Component({
  selector: 'app-tab-navigation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tab-navigation.component.html',
  styleUrl: './tab-navigation.component.scss',
})
export class TabNavigationComponent {
  @Input({ required: true }) activeSection: PrimarySection = 'Evolve';
  @Output() sectionChange = new EventEmitter<PrimarySection>();

  readonly tabs: ReadonlyArray<{ label: PrimarySection; icon: string }> = [
    { label: 'Evolve', icon: 'EV' },
    { label: 'Squad', icon: 'SQ' },
    { label: 'Battle', icon: 'VS' },
    { label: 'Explore', icon: 'EX' },
    { label: 'Archive', icon: 'DX' },
  ];
}
