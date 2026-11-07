import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { IconComponent, IconName } from '../../shared/icon/icon';

interface ServiceCard {
  icon: IconName;
  title: string;
  text: string;
  link: string;
  /** Preselects this service on the booking page (matches api service ids). */
  serviceId?: number;
}

interface Step {
  title: string;
  text: string;
}

@Component({
  selector: 'app-home',
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  protected readonly services: ServiceCard[] = [
    {
      icon: 'stethoscope',
      title: 'Check-ups',
      text: 'Routine exams and vaccinations in a calm space.',
      link: '/appointments',
      serviceId: 1,
    },
    {
      icon: 'scissors',
      title: 'Grooming',
      text: "Brushing, nail trims and baths at your cat's own pace.",
      link: '/appointments',
      serviceId: 2,
    },
    {
      icon: 'house',
      title: 'Boarding',
      text: "Quiet, cozy stays with daily play while you're away.",
      link: '/appointments',
      serviceId: 4,
    },
    {
      icon: 'shopping-bag',
      title: 'Cat store',
      text: 'Food, toys and litter picked by people who love cats.',
      link: '/store',
    },
  ];

  protected readonly benefits = [
    'Cat-only waiting area',
    'Unhurried appointments',
    'A clear update after every visit',
  ];

  protected readonly steps: Step[] = [
    {
      title: 'Pick a service',
      text: 'Choose the care your cat needs, from a check-up to a full groom.',
    },
    {
      title: 'Choose a time',
      text: 'See what is open and pick the slot that suits you.',
    },
    {
      title: 'Bring your cat',
      text: "Your booking is saved and we'll have everything ready when you arrive.",
    },
  ];
}
