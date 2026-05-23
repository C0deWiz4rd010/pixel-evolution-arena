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
    { label: 'Evolution Tree', icon: 'TREE' },
    { label: 'Squad', icon: 'TEAM' },
    { label: 'Arena', icon: 'VS' },
    { label: 'Collection', icon: 'DEX' },
  ];

  readonly handbookTab = { label: 'Handbook', icon: '?' };

  readonly linkTypes = [
    { label: 'Standard', className: 'standard' },
    { label: 'Branch', className: 'branch' },
    { label: 'Special', className: 'special' },
  ];
}
