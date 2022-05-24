import { NextFunction, Request, Response } from "express"
import { getRepository } from "typeorm"
import { Group } from "../entity/group.entity"
import { CreateGroupInput, UpdateGroupInput } from "../interface/group.interface"

export class GroupController {
  private groupRepository = getRepository(Group)

  async allGroups(request: Request, response: Response, next: NextFunction) {
    return this.groupRepository.find()
  }

  async createGroup(request: Request, response: Response, next: NextFunction) {
    // Task 1: 
    // Add a Group

    const { body: params } = request
    const createGroupInput: CreateGroupInput ={
      name: params.name,
      number_of_weeks: params.number_of_weeks,
      roll_states: params.roll_states,
      incidents: params.incidents,
      ltmt: params.ltmt
    }

    const group = new Group()
    group.prepareToCreate(createGroupInput)
    return this.groupRepository.save(group)
  }

  async updateGroup(request: Request, response: Response, next: NextFunction) {
    const { body: params } = request

    const updateGroupInput: UpdateGroupInput ={
      id: params.id,
      name: params.name,
      number_of_weeks: params.number_of_weeks,
      roll_states: params.roll_states,
      incidents: params.incidents,
      ltmt: params.ltmt
    }
    const result = await this.groupRepository.findOne(params.id);
    if(result) {
      result.prepareToCreate(updateGroupInput)
      return this.groupRepository.save(result)
    }
    else {
      return "No groups Found"
    }
  }

  async removeGroup(request: Request, response: Response, next: NextFunction) {
    let groupToRemove = await this.groupRepository.findOne(request.params.id)
    return await this.groupRepository.remove(groupToRemove)
  }

  async getGroupStudents(request: Request, response: Response, next: NextFunction) {
    // Task 1: 
        
    // Return the list of Students that are in a Group
  }


  async runGroupFilters(request: Request, response: Response, next: NextFunction) {
    // Task 2:
  
    // 1. Clear out the groups (delete all the students from the groups)

    // 2. For each group, query the student rolls to see which students match the filter for the group

    // 3. Add the list of students that match the filter to the group
  }
}
