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
    { label: 'Evolution Tree', icon: 'TREE', signal: 'Node map' },
    { label: 'Squad', icon: 'SQ', signal: '3 slots' },
    { label: 'Arena', icon: 'VS', signal: 'Rewards' },
    { label: 'Collection', icon: 'DEX', signal: 'Filters' },
  ];

  readonly handbookTab = { label: 'Handbook', icon: 'MAN', signal: 'Manual/Data' };

  readonly linkTypes = [
    { label: 'Standard', hint: 'main route', className: 'standard' },
    { label: 'Branch', hint: 'alternate path', className: 'branch' },
    { label: 'Special', hint: 'item gate', className: 'special' },
  ];
}
