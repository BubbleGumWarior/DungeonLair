import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Skill {
  name: string;
  description: string;
  stat: string;
  damage: string;
  modifier: string;
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
  
  @Output() resultRolled = new EventEmitter<string>();

  private demoSkills: Skill[] = [
    { 
        name: 'Hammer Kick', 
        stat: 'Strength',
        damage: 'd50',
        modifier: '+4',
        description: 'Lift leg upwards and strike down on target mimicking the movement of a hammer coming down. Lift leg upwards and strike down on target mimicking the movement of a hammer coming down. Lift leg upwards and strike down on target mimicking the movement of a hammer coming down. Lift leg upwards and strike down on target mimicking the movement of a hammer coming down. Lift leg upwards and strike down on target mimicking the movement of a hammer coming down. Lift leg upwards and strike down on target mimicking the movement of a hammer coming down. Lift leg upwards and strike down on target mimicking the movement of a hammer coming down. Lift leg upwards and strike down on target mimicking the movement of a hammer coming down. Lift leg upwards and strike down on target mimicking the movement of a hammer coming down.'
    },
    { 
        name: 'Dragon Punch', 
        stat: 'Strength',
        damage: 'd100',
        modifier: '+4',
        description: 'A powerful upward punch that sends the opponent flying into the air.'
    },
    { 
        name: 'Shadow Step', 
        stat: 'Strength',
        damage: 'd80',
        modifier: '+4',
        description: 'Quickly dash to the side, evading an attack and repositioning for a counter.'
    },
    { 
        name: 'Phoenix Strike', 
        stat: 'Strength',
        damage: 'd10',
        modifier: '+4',
        description: 'A flurry of punches ending with a fiery uppercut that ignites the opponent.'
    },
    { 
        name: 'Thunder Clap', 
        stat: 'Strength',
        damage: 'd18',
        modifier: '+4',
        description: 'Clap hands together to create a shockwave that knocks back nearby enemies.'
    },
    { 
        name: 'Earthquake Slam', 
        stat: 'Strength',
        damage: 'd65',
        modifier: '+4',
        description: 'Jump into the air and slam down with both fists, causing a shockwave that stuns enemies.'
    },
    { 
        name: 'Wind Blade', 
        stat: 'Strength',
        damage: 'd1000',
        modifier: '+4',
        description: 'Unleash a sharp blade of wind that slices through enemies from a distance.'
    },
    { 
        name: 'Ice Shard', 
        stat: 'Strength',
        damage: 'd300',
        modifier: '+4',
        description: 'Create and hurl a shard of ice at the target, slowing them down on impact.'
    },
    { 
        name: 'Flame Twirl', 
        stat: 'Strength',
        damage: 'd20',
        modifier: '+4',
        description: 'Perform a spinning kick while igniting the leg in flames, hitting all nearby foes.'
    },
    { 
        name: 'Whirlwind Spin', 
        stat: 'Strength',
        damage: 'd40',
        modifier: '+4',
        description: 'A spinning attack that strikes all enemies around in a wide radius.'
    },
    { 
        name: 'Berserker Charge', 
        stat: 'Strength',
        damage: 'd10',
        modifier: '+4',
        description: 'Rush forward with reckless abandon, tackling the first enemy in the path.'
    },
    { 
        name: 'Lightning Strike', 
        stat: 'Strength',
        damage: 'd50',
        modifier: '+4',
        description: 'A swift and precise jab that channels electrical energy to stun the target.'
    },
    { 
        name: 'Abyssal Grasp', 
        stat: 'Strength',
        damage: 'd350',
        modifier: '+4',
        description: 'Reach out with dark energy, ensnaring and damaging an enemy from a distance.'
    },
    { 
        name: 'Sonic Boom', 
        stat: 'Strength',
        damage: 'd450',
        modifier: '+4',
        description: 'Release a powerful wave of sound that disorients and damages enemies in its path.'
    },
    { 
        name: 'Viper Kick', 
        stat: 'Strength',
        damage: 'd550',
        modifier: '+4',
        description: 'A quick and sneaky kick that targets the opponent’s legs, causing them to stumble.'
    },
    { 
        name: 'Falcon Dive', 
        stat: 'Strength',
        damage: 'd520',
        modifier: '+4',
        description: 'Leap high into the air and crash down with a knee strike, targeting the opponent’s head.'
    },
    { 
        name: 'Soul Reap', 
        stat: 'Strength',
        damage: 'd200',
        modifier: '+4',
        description: 'Draining energy from an enemy with a quick touch, weakening them while restoring health.'
    },
    { 
        name: 'Meteor Drop', 
        stat: 'Strength',
        damage: 'd100',
        modifier: '+4',
        description: 'Jump high and descend with an explosive punch that creates a small crater on impact.'
    },
    { 
        name: 'Crescent Kick', 
        stat: 'Strength',
        damage: 'd250',
        modifier: '+4',
        description: 'Execute a sweeping kick that knocks enemies off their feet in a wide arc.'
    },
    { 
        name: 'Starlight Burst', 
        stat: 'Strength',
        damage: 'd75',
        modifier: '+4',
        description: 'Channel celestial energy to unleash a burst of light that blinds and damages foes.'
    },
    { 
        name: 'Guardian Shield', 
        stat: 'Strength',
        damage: 'd64',
        modifier: '+4',
        description: 'Summon a protective barrier that blocks incoming attacks for a short time.'
    },
    { 
        name: 'Frostbite', 
        stat: 'Strength',
        damage: 'd50',
        modifier: '+4',
        description: 'A quick jab that chills the opponent, reducing their movement speed for a duration.'
    }
  ];

  rollDice(event: Event) {
    const target = event.currentTarget as HTMLElement;
    const damageText = target.querySelector('.text-3xl:nth-of-type(1)') as HTMLElement;
    const modifierText = target.querySelector('.text-3xl:nth-of-type(2)') as HTMLElement;
    const diceSizeText = damageText.innerText.trim();
    const modifierValueText = modifierText.innerText.trim();
    let resultMessage = '';

    const diceSize = diceSizeText.slice(1, diceSizeText.length);

    const diceRoll = parseInt(diceSize, 10); 
    
    const modifier = parseInt(modifierValueText, 10);  // Convert string to number
    const roll = Math.floor(Math.random() * diceRoll) + 1;  // Roll a dice
    

    if (roll === diceRoll) {
      resultMessage = `Critical ${diceRoll}!!!`;  // Ignore modifier
    } else if (roll === 1) {
      resultMessage = 'Natural 1...';  // Ignore modifier
    } else {
      const finalResult = roll + modifier;
      resultMessage = `You have rolled a ${roll} with a modifier of ${modifier >= 0 ? '+' + modifier : modifier} and got ${finalResult}`;
    }


    this.resultRolled.emit(resultMessage);
  }


  ngOnInit(): void {
      this.skills = this.demoSkills;
  }
}
