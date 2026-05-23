import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-tab-navigation',
  templateUrl: './tab-navigation.component.html',
  styleUrl: './tab-navigation.component.scss',
})
export class TabNavigationComponent {
  @Input({ required: true }) activeTab = 'Evolution Tree';
  @Output() tabChange = new EventEmitter<string>();

  readonly tabs = [
    { label: 'Evolution Tree', icon: 'ET' },
    { label: 'Squad', icon: 'SQ' },
    { label: 'Arena', icon: 'VS' },
    { label: 'Collection', icon: 'DX' },
  ];

  readonly handbookTab = { label: 'Handbook', icon: 'HB' };

  readonly linkTypes = [
    { label: 'Standard', className: 'standard' },
    { label: 'Alternate', className: 'branch' },
    { label: 'Special', className: 'special' },
  ];
}
