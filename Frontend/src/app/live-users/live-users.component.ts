import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { localIP } from '../config'; // Import the IP address

@Component({
  selector: 'app-live-users',
  templateUrl: './live-users.component.html',
  styleUrls: ['./live-users.component.css']
})
export class LiveUsersComponent implements OnInit {
  liveUsers: any[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.fetchLiveUsers();
  }

  fetchLiveUsers() {
    this.http.get(`https://${localIP}:8080/api/live-users`)
      .subscribe(
        (data: any) => {
          this.liveUsers = data;
        },
        (error) => {
          console.error('Error fetching live users:', error);
        }
      );
  }
}
