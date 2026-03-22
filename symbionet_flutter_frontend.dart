// SymbioNet Flutter Frontend Reference
import 'package:flutter/material.dart';

void main() => runApp(SymbioNetApp());

class SymbioNetApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      theme: ThemeData.dark(),
      home: NGODashboard(),
    );
  }
}

class VolunteerFeed extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('SymbioNet Feed')),
      body: Column(
        children: [
          // Gamification Section
          Container(
            padding: EdgeInsets.all(16),
            color: Colors.greenAccent.withOpacity(0.1),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                Column(children: [Text('Points', style: TextStyle(fontSize: 12)), Text('150', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold))]),
                Column(children: [Text('Badges', style: TextStyle(fontSize: 12)), Row(children: [Icon(Icons.star, size: 16), Icon(Icons.verified, size: 16)])]),
              ],
            ),
          ),
          // Task List
          Expanded(
            child: ListView.builder(
              itemCount: 5,
              itemBuilder: (context, index) => Card(
                child: ListTile(
                  title: Text('Micro-task #$index'),
                  subtitle: Text('Shadow Skill: Visual Empathy • Priority: High'),
                  trailing: ElevatedButton(onPressed: () {}, child: Text('Claim')),
                ),
              ),
            ),
          ),
          // Leaderboard Section
          Container(
            height: 100,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                Padding(padding: EdgeInsets.all(8), child: Chip(label: Text('#1 EcoWarrior: 450pts'))),
                Padding(padding: EdgeInsets.all(8), child: Chip(label: Text('#2 You: 150pts'))),
              ],
            ),
          )
        ],
      ),
    );
  }
}
