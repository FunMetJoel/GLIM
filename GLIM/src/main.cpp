#include <Servo.h>

int loopnum = 0;
Servo myservo;

void setup() {
  Serial.begin(9600);
  myservo.attach(9);
}

int pos = 0;

void loop() {
  loopnum++;
  Serial.println(loopnum);
  delay(1000);
  for (pos = 0; pos <= 180; pos += 1) { // goes from 0 degrees to 180 degrees
    // in steps of 1 degree
    myservo.write(pos);              // tell servo to go to position in variable 'pos'
    delay(15);                       // waits 15 ms for the servo to reach the position
  }
}