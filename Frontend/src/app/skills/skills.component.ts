import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Skill {
  name: string;
  description: string;
}

@Component({
  selector: 'app-skills',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './skills.component.html',
  styleUrls: ['./skills.component.css'] // Fixed typo: should be styleUrls instead of styleUrl
})
export class SkillsComponent implements OnInit {
  skills: Skill[] = [];

  private demoSkills: Skill[] = [
    { 
        name: 'Hammer Kick', 
        description: 'Lift leg upwards and strike down on target mimicking the movement of a hammer coming down.'
    },
    { 
        name: 'Dragon Punch', 
        description: 'A powerful upward punch that sends the opponent flying into the air.'
    },
    { 
        name: 'Shadow Step', 
        description: 'Quickly dash to the side, evading an attack and repositioning for a counter.'
    },
    { 
        name: 'Phoenix Strike', 
        description: 'A flurry of punches ending with a fiery uppercut that ignites the opponent.'
    },
    { 
        name: 'Thunder Clap', 
        description: 'Clap hands together to create a shockwave that knocks back nearby enemies.'
    },
    { 
        name: 'Earthquake Slam', 
        description: 'Jump into the air and slam down with both fists, causing a shockwave that stuns enemies.'
    },
    { 
        name: 'Wind Blade', 
        description: 'Unleash a sharp blade of wind that slices through enemies from a distance.'
    },
    { 
        name: 'Ice Shard', 
        description: 'Create and hurl a shard of ice at the target, slowing them down on impact.'
    },
    { 
        name: 'Flame Twirl', 
        description: 'Perform a spinning kick while igniting the leg in flames, hitting all nearby foes.'
    },
    { 
        name: 'Whirlwind Spin', 
        description: 'A spinning attack that strikes all enemies around in a wide radius.'
    },
    { 
        name: 'Berserker Charge', 
        description: 'Rush forward with reckless abandon, tackling the first enemy in the path.'
    },
    { 
        name: 'Lightning Strike', 
        description: 'A swift and precise jab that channels electrical energy to stun the target.'
    },
    { 
        name: 'Abyssal Grasp', 
        description: 'Reach out with dark energy, ensnaring and damaging an enemy from a distance.'
    },
    { 
        name: 'Sonic Boom', 
        description: 'Release a powerful wave of sound that disorients and damages enemies in its path.'
    },
    { 
        name: 'Viper Kick', 
        description: 'A quick and sneaky kick that targets the opponent’s legs, causing them to stumble.'
    },
    { 
        name: 'Falcon Dive', 
        description: 'Leap high into the air and crash down with a knee strike, targeting the opponent’s head.'
    },
    { 
        name: 'Soul Reap', 
        description: 'Draining energy from an enemy with a quick touch, weakening them while restoring health.'
    },
    { 
        name: 'Meteor Drop', 
        description: 'Jump high and descend with an explosive punch that creates a small crater on impact.'
    },
    { 
        name: 'Crescent Kick', 
        description: 'Execute a sweeping kick that knocks enemies off their feet in a wide arc.'
    },
    { 
        name: 'Starlight Burst', 
        description: 'Channel celestial energy to unleash a burst of light that blinds and damages foes.'
    },
    { 
        name: 'Guardian Shield', 
        description: 'Summon a protective barrier that blocks incoming attacks for a short time.'
    },
    { 
        name: 'Frostbite', 
        description: 'A quick jab that chills the opponent, reducing their movement speed for a duration.'
    }
  ];


  ngOnInit(): void {
      this.skills = this.demoSkills;
  }
}
